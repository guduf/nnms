import { LogEntry } from 'winston'
import { Observable, Subject, Subscription, OperatorFunction } from 'rxjs'
import { scan, shareReplay, startWith } from 'rxjs/operators'
import shortid from 'shortid'

export interface LoggerConfig {
  baseUri?: string[]
  isProduction: boolean
}

export type LoggerLevel = 'error' | 'warn' | 'info' | 'debug'

export abstract class LoggerError extends Error {
  level: 'error' | 'warn'
  code: string
  message: string
  data?: LoggerEvent['data']
  constructor(
    level: 'error' | 'warn',
    code: string,
    message: string,
    data?: LoggerEvent['data']
  ) {
    super(message)
    Object.setPrototypeOf(this, LoggerError.prototype)
    this.level = level
    this.code = code
    this.data = data
  }
}

export const LOGGER_LEVELS: { [level in LoggerLevel]: { color: string} } = {
  error: {color: 'red'},
  warn: {color: 'yellow'},
  info: {color: 'cyan'},
  debug: {color: 'white'}
}

export interface LoggerTags {
  resource: 'app' | 'mod' | 'prov' | 'plug'
  [tag: string]: string
}

export interface LoggerEventData {
  message?: string
  [key: string]: any
}

export interface LoggerEventMetricMutation<T extends { [key: string]: any } = { [key: string]: any }> {
  metricKey?: string
  $add?: T[]
  $remove?: string[]
  $patch?: T[]
}

export interface LoggerEventMetricMutations {
  [metricName: string]: LoggerEventMetricMutation
}

export interface LoggerEvent<T extends LoggerEventData = LoggerEventData> extends LogEntry {
  id: string
  level: LoggerLevel
  code: string
  tags: LoggerTags
  data?: T
  metrics?: LoggerEventMetricMutations
}

export class LoggerSubject {
  readonly events: Observable<LoggerEvent>
  private readonly _events = new Subject<LoggerEvent>()
  private readonly _subscr = new Subscription()

  constructor() {
    this.events = this._events.pipe(shareReplay())
    this._subscr.add(this.events.subscribe())
  }

  unsubscribe(): void {
    this._events.complete()
    this._subscr.unsubscribe()
  }

  next(e: LoggerEvent): void {
    this._events.next(e)
  }
}

export class Logger {
  get events(): Observable<LoggerEvent> {
    return this._subject.events
  }

  static create(tags: LoggerTags): Logger {
    return new Logger(new LoggerSubject(), tags)
  }

  private constructor(
    private readonly _subject: LoggerSubject,
    readonly tags: LoggerTags
  ) { }

  catch(
    loggerErrorOrLevel: LoggerError | 'debug' | 'error' | 'warn',
    code: string,
    messageOrError: string | Error,
    dataOrError?: Error | {},
    data: LoggerEventData = {}
  ): void {
    if (loggerErrorOrLevel instanceof LoggerError) return this.catch(
      loggerErrorOrLevel.level,
      loggerErrorOrLevel.code,
      loggerErrorOrLevel.message,
      loggerErrorOrLevel.data
    )
    const error = (
      messageOrError instanceof Error ? messageOrError :
        dataOrError instanceof Error ? dataOrError :
          null
    )
    const message = (
      typeof messageOrError === 'string' && messageOrError ?
        messageOrError :
        error ? error.message : 'INVALID_ERROR_LOG'
    )
    data = dataOrError instanceof Error ? data : dataOrError as {}
    this.log({
      level: loggerErrorOrLevel,
      code,
      data: {message, ...(error ? {$catched: error.message} : {})}
    })
  }

  extend(tags: LoggerTags): Logger {
    if (tags.resource === this.tags.resource) throw new Error(
      `Logger cannot extend the same resource '${tags.resource}'`
    )
    const newTags = Object.keys(tags).reduce((acc, tag) => {
      if (tag !== 'resource' && acc[tag]) throw new Error(`Logger tag '${tag}' cannot be extended`)
      return {...acc, [tag]: tags[tag]}
    }, this.tags)
    return new Logger(this._subject, newTags)
  }

  log(e: Pick<LoggerEvent, 'level' | 'code' | 'data' | 'metrics'>): void {
    this._subject.next({
      ...e,
      id: shortid(),
      message: (e.data || {message : ''}).message || e.code,
      tags: this.tags
    })
  }

  debug(data?: string | LoggerEventData): void {
    this.log({
      level: 'debug',
      code: '*DEBUG',
      data: typeof data === 'string' ? {message: data} : data
    })
  }

  error(
    code: string,
    messageOrError: string | Error,
    errorOrData?: Error | {},
    data?: LoggerEventData
  ): void {
    this.catch('error', code, messageOrError, errorOrData, data)
  }

  info(code: string, data?: LoggerEventData, metrics?: LoggerEventMetricMutations): void {
    this.log({level: 'info', code, data, metrics})
  }

  warn(
    code: string,
    messageOrError: string | Error,
    errorOrData?: Error | LoggerEventData,
    data?: LoggerEventData
  ): void {
    this.catch('warn', code, messageOrError, errorOrData, data)
  }

  metric(
    messageOrMetrics: string | LoggerEventMetricMutations,
    metrics?: LoggerEventMetricMutations
  ): void {
    const message = typeof messageOrMetrics === 'string' ? messageOrMetrics : undefined
    metrics = typeof messageOrMetrics === 'string' ? metrics : messageOrMetrics
    this.log({level: 'debug', code: '*METRIC', metrics, data: message ? {message} : {}})
  }
}


export function matchTags(target: LoggerTags, test: LoggerTags, extraTags = false): boolean {
  const result = !Object.keys(test).find(tag => target[tag] !== test[tag])
  if (!result || !extraTags) return result
  return Object.keys(test).length === Object.keys(target).length
}

export function scanMetrics<T>(tags: LoggerTags, metricName: string): OperatorFunction<LoggerEvent, T[]> {
  return events => events.pipe(
    scan((metrics, e) => {
      const mutation = (e.metrics || {})[metricName] as LoggerEventMetricMutation<T>
      if (!mutation) return metrics
      if (!matchTags(e.tags, tags)) return metrics
      const {$add: add, $remove: remove, $patch: patch, metricKey} = mutation
      if (remove) metrics = metrics.filter(data => (
        !remove.includes((data as unknown as { id: string })[(metricKey || 'id') as 'id'])
      ))
      if (add) metrics = [...metrics, ...add]
      if (patch) metrics = metrics.map(metricData => {
        const id = (metricData as unknown as { id: string })[(metricKey || 'id') as 'id']
        const patchData = patch.find(_patchData => (_patchData as unknown as { id: string })[(metricKey || 'id') as 'id'] === id)
        if (!patchData) return metricData
        return {...metricData, ...patchData}
      })
      return metrics
    }, [] as T[]),
    startWith([] as T[]),
    shareReplay(1)
  )
}

export default Logger
