import { Record as ImmutableRecord, Map, Stack } from 'immutable'
import { map, shareReplay, share } from 'rxjs/operators'
import { BehaviorSubject, Observable } from 'rxjs'

import { Logger, LoggerEvent, LoggerSource, LoggerEventMetricMutation, applyMetricMutation } from 'nnms'
import { JsonObject } from 'type-fest';

export const Log = ImmutableRecord(
  ['id', 'code', 'level', 'message', 'data', 'timestamp'].reduce((acc, key) => (
    {...acc, [key]: null}
  ), {}) as Omit<LoggerEvent, 'tags'>
)

export type StateItem<T> = { tags: Map<string, string>, entries: T }
export type State<T> = Map<LoggerSource, Map<string, StateItem<T>>>
export type LogStack = Stack<ImmutableRecord<Omit<LoggerEvent, 'tags'>>>
export type MetricMap = Map<string, JsonObject[]>

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
  get metrics(): State<Map<string, JsonObject[]>> { return this._metrics.value }

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

  getMetrics<T extends JsonObject>(src: LoggerSource, id: string): Observable<T> {
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
      const entries = this._applyMutations(Map(), e.metrics, e.data)
      return this._metrics.next(this.metrics.setIn(path, {tags, entries}))
    }
    const newMetrics = this._applyMutations(oldMetrics, e.metrics, e.data)
    if (newMetrics.equals(oldMetrics)) return
    this._metrics.next(this.metrics.setIn([...path, 'entries'], newMetrics))
  }

  private _applyMutations(
    metrics: Map<string, JsonObject[]>,
    mutations: Record<string, LoggerEventMetricMutation>,
    data?: JsonObject
  ): Map<string, JsonObject[]> {
    return Object.keys(mutations).reduce((acc, key) => {
      const nextMetric = applyMetricMutation(
        metrics.get(key) || [],
        mutations[key],
        data
      )
      return acc.set(key, nextMetric)
    }, metrics)
  }
}
