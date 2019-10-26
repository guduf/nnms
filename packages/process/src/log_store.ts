import { mergeMap } from 'rxjs/operators'
import { Observable, merge, from, of, BehaviorSubject, throwError } from 'rxjs'

import { Log, LogMetricValue, LogTags, applyMetricMutation } from 'nnms'

import { LogRecord } from './log_record'

export interface LoggerMetrics {
  tags: LogTags
  metrics: Record<string, LogMetricValue[]>
}

export class LogStore {
  constructor(
    private readonly _flow: Observable<Log>
  ) { }

  private readonly _logs = [] as LogRecord[]
  private readonly _metrics = new BehaviorSubject<Record<string, LoggerMetrics>>({})
  private readonly _subscr = this._flow.subscribe(e => {
    try {
      if (e.level !== 'DBG') this._logs.push(LogRecord(e))
      if (e.metrics) this._applyMetricMutations(e)
    } catch (err) {
      console.error(err)
    }
  })

  _applyMetricMutations(log: Log): void {
    const loggerState = (
      this._metrics.value[log.tags.logger] ||
      {tags: log.tags, metrics: {}}
    )
    const metrics = {...loggerState.metrics}
    for (const entry in log.metrics) {
      metrics[entry] = applyMetricMutation(metrics[entry] || [], log.metrics[entry])
    }
    this._metrics.next({...this._metrics.value, [log.tags.logger]: {...loggerState, metrics}})
  }

  getMetrics(): Observable<Record<string, LoggerMetrics>> {
    if (this._subscr.closed) return throwError(new Error('subscription closed'))
    return this._metrics.asObservable()
  }

  getLogs(): Observable<LogRecord> {
    if (this._subscr.closed) return throwError(new Error('subscription closed'))
    return merge(from(this._logs), this._flow).pipe(mergeMap(e => {
      const record = (e instanceof Log ? LogRecord(e) : e)
      return of(record)
    }))
  }

  unsubscribe() {
    this._logs.length = 0
    this._metrics.unsubscribe()
    this._subscr.unsubscribe()
  }
}
