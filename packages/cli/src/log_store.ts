import { Record as ImmutableRecord, Map, Stack, List } from 'immutable'
import { map, shareReplay, share } from 'rxjs/operators'
import { BehaviorSubject, Observable } from 'rxjs'

import { Logger, LoggerEvent, LoggerSource, LoggerEventMetricMutations, LoggerMetricValue } from 'nnms'

export const Log = ImmutableRecord(
  ['id', 'code', 'level', 'message', 'data', 'timestamp'].reduce((acc, key) => (
    {...acc, [key]: null}
  ), {}) as Omit<LoggerEvent, 'tags'>
)

type MetricPrimitive = string | number | boolean
export type MetricList = List<Map<string, MetricPrimitive>>
export type MetricValue = MetricPrimitive | MetricList
export type StateItem<T> = { tags: Map<string, string>, entries: T }
export type State<T> = Map<LoggerSource, Map<string, StateItem<T>>>
export type LogStack = Stack<ImmutableRecord<Omit<LoggerEvent, 'tags'>>>
export type MetricMap = Map<string, MetricValue>

export class LogStore {
  private readonly _logs = new BehaviorSubject<State<LogStack>>(
    Map({mod: Map(), prov: Map(), plug: Map()}) as Map<LoggerSource, any>
  )
  private readonly _metrics = new BehaviorSubject<State<MetricMap>>(
    Map({mod: Map(), prov: Map(), plug: Map()}) as Map<LoggerSource, any>
  )

  readonly logsChange = this._logs.asObservable()
  readonly metricsChange = this._metrics.asObservable()

  get logs(): State<LogStack> { return this._logs.value }
  get metrics(): State<Map<string, MetricValue>> { return this._metrics.value }

  constructor(logger: Logger) {
    logger.events.subscribe(e => {
      const src = e.tags.src
      const srcId = e.tags[src]
      this._setInLogs([src, srcId], e)
      this._setInMetrics([src, srcId], e)
    })
  }

  getLogs(src: LoggerSource, id: string): Observable<LoggerEvent[]> {
    return this._logs.pipe(
      map(state => {
        const item = state.getIn([src, id]) as StateItem<LogStack>
        if (!item) return []
        const tags = {...item.tags.toJS(), src, [src]: id}
        return item.entries.map(entry => ({...entry.toJS(), tags})).reverse().toJS()
      }),
      share()
    )
  }

  getMetrics<T extends { [key: string]: LoggerMetricValue }>(src: LoggerSource, id: string): Observable<T> {
    return this._metrics.pipe(
      map(state => {
        const item = state.getIn([src, id]) as StateItem<MetricMap>
        if (!item) return {} as T
        return item.entries.toJS() as T
      }),
      shareReplay(1)
    )
  }

  getAllLogs(): Observable<LoggerEvent[]> {
    return this._logs.pipe(map(state => {
      return state.keySeq().reduce((acc, src) => {
        const srcItems = state.get(src)
        if (!srcItems) return acc
        return srcItems.keySeq().reduce((subAcc, id) => {
          const item = srcItems.get(id)
          if (!item) return subAcc
          const tags = {src, [src]: id, ...item.tags.toJS()}
          return [...subAcc, ...item.entries.map(log => ({...log.toJS(), tags})).toJS() as LoggerEvent[]]
        }, acc).sort((x, y) => (x.timestamp > y.timestamp ? 1 : -1))
      }, [] as LoggerEvent[])
    }))
  }

  private _setInLogs(path: [LoggerSource, string], e: LoggerEvent): void {
    if (e.level === 'debug') return
    const log = Log(e)
    const oldLogs = this.logs.getIn([...path, 'entries'])
    if (!oldLogs) {
      const logTags = {...e.tags}
      delete logTags.src
      delete logTags[e.tags.src]
      return this._logs.next(this.logs.setIn(path, {tags: Map(logTags), entries: Stack([log])}))
    }
    this._logs.next(this.logs.setIn([...path, 'entries'], oldLogs.unshift(log)))
  }

   private _setInMetrics(path: [LoggerSource, string], e: LoggerEvent): void {
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
    metrics: Map<string, MetricValue>,
    mutations: LoggerEventMetricMutations
  ): Map<string, MetricValue> {
    for (const metricName in mutations) {
      if (['string', 'number', 'boolean'].includes(typeof mutations[metricName])) {
        metrics = metrics.setIn(metricName, mutations[metricName])
      }
      let metricList = metrics.get(metricName) as MetricList || List()
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
          const id = (metricData as unknown as ImmutableRecord<{ id: string }>).get((metricKey || 'id') as 'id')
          const patchData = $patch.find(_patchData => (
            (_patchData as unknown as { id: string })[(metricKey || 'id') as 'id'] === id
          ))
          if (!patchData) return metricData
          return metricData.merge(patchData as Record<string, MetricPrimitive>)
        })
      )
      metrics = metrics.set(metricName, metricList)
    }
    return metrics
  }
}
