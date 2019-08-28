import { Logger, LoggerLevel, LoggerEventData, LoggerEvent, LoggerSource, LoggerEventMetricMutations } from 'nnms'
import { BehaviorSubject } from 'rxjs';
import { Record as ImmutableRecord, Map, Stack, List } from 'immutable'
import { LoggerMetricValue } from 'nnms';

export type Log = {
  id: string
  level: LoggerLevel
  message: string
  data: LoggerEventData
}

export const Log  = ImmutableRecord(
  {id: null, level: null, message: null, data: null} as unknown as Log
)

type MetricPrimitive = string | number | boolean
export type Metric = MetricPrimitive | List<Map<string, MetricPrimitive>>
export type StateEntry<T> = { tags: Map<string, string>, entries: T }
export type State<T> = Map<LoggerSource, Map<string, StateEntry<T>>>

export class LogStore {
  private readonly _logs = new BehaviorSubject<State<Stack<Log>>>(
    Map({mod: Map(), prov: Map(), plug: Map()}) as Map<LoggerSource, any>
  )
  private readonly _metrics = new BehaviorSubject<State<Map<string, Metric>>>(
    Map({mod: Map(), prov: Map(), plug: Map()}) as Map<LoggerSource, any>
  )

  readonly logsChange = this._logs.asObservable()
  readonly metricsChange = this._metrics.asObservable()

  get logs(): State<Stack<Log>> { return this._logs.value }
  get metrics(): State<Map<string, Metric>> { return this._metrics.value }

  constructor(logger: Logger) {
    logger.events.subscribe(e => {
      const src = e.tags.src
      const srcId = e.tags[src]
      this._setInLogs([src, srcId], e)
      this._setInMetrics([src, srcId], e)
    })
  }

  private _setInLogs(path: [LoggerSource, string], {id, level, message, data, tags}: LoggerEvent): void {
    if (level !== 'debug') return
    const log = Log({id, level, message, data})
    if (!this.logs.getIn(path)) {
      const logTags = {...tags}
      delete logTags.src
      delete logTags[path[1]]
      return this._logs.next(this.logs.setIn(path, {tags: logTags, entries: Stack([log])}))
    }
    this._logs.next(this.logs.setIn([...path, 'entries'], this.logs.getIn(path).unshift(log)))
  }

  private _setInMetrics(
    path: [LoggerSource, string],
    e: LoggerEvent
  ): void {
    if (!e.metrics) return
    const oldMetrics = this.metrics.getIn([...path, 'entries'])
    if (!oldMetrics) {
      const tags = {...e.tags}
      delete tags.src
      delete tags[path[1]]
      const entries = this._applyMutations(Map(), e.metrics)
      return this._metrics.next(this.metrics.setIn(path, {tags, entries}))
    }
    const newMetrics = this._applyMutations(oldMetrics, e.metrics)
    if (newMetrics.equals(oldMetrics)) return
    this._metrics.next(this.metrics.setIn([...path, 'entries'], newMetrics))
  }

  private _applyMutations(
    metrics: Map<string, LoggerMetricValue>,
    mutations: LoggerEventMetricMutations
  ): Map<string, LoggerMetricValue> {
    for (const metricName in mutations) {
      if (['string', 'number', 'boolean'].includes(typeof mutations[metricName])) {
        metrics = metrics.setIn(metricName, mutations[metricName])
      }
      let metricList = metrics.getIn(metricName) as List<Map<string, string | number | boolean>> || Map()
      const {$remove, $insert, $upsert, $patch, metricKey} = mutations[metricName]
      if ($remove) metrics = metrics.filter(data => (
        !$remove.includes((data as unknown as { id: string })[(metricKey || 'id') as 'id'])
      ))
      if ($insert) metricList = (
        metricList.push(...($insert as Record<string, MetricPrimitive>[]).map(item => Map(item)))
      )
      if ($upsert) metricList = (
        $upsert.reduce((acc, upsertMetric) => {
          const id = (upsertMetric as unknown as { id: string })[(metricKey || 'id') as 'id']
          const item = Map(upsertMetric as Record<string, MetricPrimitive>)
          const existingData = acc.find(data => (
            (data as unknown as { id: string })[(metricKey || 'id') as 'id'] === id
          ))
          if (existingData) {
            const i = acc.indexOf(existingData)
            return acc.map((existingMetric, j) => i === j ? item : existingMetric)
          }
          return acc.push(item)
        }, metricList)
      )
      if ($patch) metricList = (
        metricList.map(metricData => {
        const id = (metricData as unknown as { id: string })[(metricKey || 'id') as 'id']
          const patchData = $patch.find(_patchData => (
            (_patchData as unknown as { id: string })[(metricKey || 'id') as 'id'] === id
          ))
          if (!patchData) return metricData
          return metricData.merge(patchData as Record<string, MetricPrimitive>)
        })
      )
      metrics = metrics.setIn(metricName, metricList)
    }
    return metrics
  }
}
