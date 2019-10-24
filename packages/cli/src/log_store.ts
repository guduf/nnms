import { Record as ImmutableRecord, Map, Stack, RecordOf } from 'immutable'
import { map, shareReplay, share } from 'rxjs/operators'
import { BehaviorSubject, Observable, Subscription } from 'rxjs'
import { JsonObject } from 'type-fest'

import { Log, LogMetricMutation, applyMetricMutation, LogMetricValue } from 'nnms'

const LOG_RECORD_KEYS = ['id', 'code', 'level', 'data', 'date', 'tags'] as const

export type LogRecordData = { [P in typeof LOG_RECORD_KEYS[number]]: Log[P extends keyof Log ? P : never] }

export const LogRecord = ImmutableRecord(
  LOG_RECORD_KEYS.reduce((acc, key) => ({...acc, [key]: null}), {} as LogRecordData)
)

export type LogRecord = RecordOf<LogRecordData>

export type StateItem<T> = { tags: Map<string, string>, entries: T }
export type State<T> = Map<string, Map<string, StateItem<T>>>
export type LogStack = Stack<ImmutableRecord<Omit<LogRecord, 'tags'>>>
export type MetricMap = Map<string, JsonObject[]>

export interface LogPublicStore {
  getAllLogs(): Observable<LogRecord>
  getLogs(src: string, id: string): Observable<LogRecord[]>
  getMetrics<T extends JsonObject>(src: string, id: string): Observable<T>
}

export class LogStore implements LogPublicStore {
  private readonly _events: Observable<LogRecord>
  private readonly _logs = new BehaviorSubject<State<LogStack>>(
    Map({mod: Map(), prov: Map(), plug: Map()}) as Map<string, any>
  )
  private readonly _metrics = new BehaviorSubject<State<MetricMap>>(
    Map({mod: Map(), prov: Map(), plug: Map()}) as Map<string, any>
  )
  private readonly _subscr: Subscription

  readonly logsChange = this._logs.asObservable()
  readonly metricsChange = this._metrics.asObservable()

  get logs(): State<LogStack> { return this._logs.value }
  get metrics(): State<Map<string, JsonObject[]>> { return this._metrics.value }

  constructor(events: Observable<Log>) {
    this._subscr = events.subscribe(
      e => {
        const src = e.tags.src
        const srcId = e.tags[src]
        this._setInLogs([src, srcId], e)
        this._setInMetrics([src, srcId], e)
      },
      err => {
        console.error('CRASH', err)
        process.exit(1)
      }
    )
    this._events = events.pipe(
      map(e => LogRecord(e)),
      shareReplay()
    )
  }

  complete(): void {
    this._subscr.unsubscribe()
  }

  getLogs(src: string, id: string): Observable<LogRecord[]> {
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

  getMetrics<T extends JsonObject>(src: string, id: string): Observable<T> {
    return this._metrics.pipe(
      map(state => {
        const item = state.getIn([src, id]) as StateItem<MetricMap>
        if (!item) return {} as T
        return item.entries.toJS() as T
      }),
      shareReplay(1)
    )
  }

  getAllLogs(): Observable<LogRecord> {
    return this._events
  }

  private _setInLogs(path: [string, string], e: Log): void {
    if (e.level === 'DBG') return
    const log = LogRecord(e)
    const oldLogs = this.logs.getIn([...path, 'entries'])
    if (!oldLogs) {
      const logTags = {...e.tags}
      delete logTags.src
      delete logTags[e.tags.src]
      return this._logs.next(this.logs.setIn(path, {tags: Map(logTags), entries: Stack([log])}))
    }
    this._logs.next(this.logs.setIn([...path, 'entries'], oldLogs.unshift(log)))
  }

   private _setInMetrics(path: [string, string], e: Log): void {
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
    metrics: Map<string, JsonObject[]>,
    mutations: Record<string, LogMetricMutation>
  ): Map<string, JsonObject[]> {
    return Object.keys(mutations).reduce((acc, key) => {
      const nextMetric = applyMetricMutation(
        metrics.get(key) as LogMetricValue[] || [],
        mutations[key]
      )
      return acc.set(key, nextMetric)
    }, metrics)
  }
}
