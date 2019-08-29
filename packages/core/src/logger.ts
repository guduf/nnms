import { Observable, Subject, Subscription, OperatorFunction } from 'rxjs'
import { scan, shareReplay, startWith, filter, distinctUntilChanged } from 'rxjs/operators'
import shortid from 'shortid'
import { LogEntry } from 'winston'

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

export type LoggerSource = 'app' | 'mod' | 'prov' | 'plug'

export interface LoggerTags {
  src: LoggerSource
  [tag: string]: string
}

export interface LoggerEventData {
  message?: string
  [key: string]: any
}

export interface LoggerMetricItem {
  [key: string]: string | number | boolean
}

export type LoggerMetricValue = string | number | boolean | LoggerMetricItem[]

export interface LoggerMetricMap { [key: string]: LoggerMetricValue }

export interface LoggerEventMetricMutation<T extends LoggerMetricValue = LoggerMetricValue> {
  metricKey?: string
  $insert?: T extends Array<LoggerMetricItem> ? T : never
  $upsert?: T extends Array<LoggerMetricItem> ? T : never
  $remove?: T extends Array<LoggerMetricItem> ? string[] : never
  $patch?: T extends Array<infer X> ? Partial<X>[] : never
}

export interface LoggerEventMetricMutations {
  [metricName: string]: LoggerEventMetricMutation
}

export interface LoggerEvent<T extends LoggerEventData = LoggerEventData> extends LogEntry {
  id: string
  timestamp: number
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
    dataOrError?: Error | {},
    data?: LoggerEventData
  ): void {
    if (loggerErrorOrLevel instanceof LoggerError) return this.catch(
      loggerErrorOrLevel.level,
      loggerErrorOrLevel.code,
      loggerErrorOrLevel.message,
      loggerErrorOrLevel.data
    )
    const error = dataOrError instanceof Error ? dataOrError : null
    data = dataOrError instanceof Error ? data : dataOrError as {}
    this.log({
      level: loggerErrorOrLevel,
      code,
      data: {...data, ...(error ? {$catched: error.message} : {})}
    })
  }

  extend(tags: LoggerTags): Logger {
    if (tags.src === this.tags.src) throw new Error(
      `Logger cannot extend the same src '${tags.src}'`
    )
    const newTags = Object.keys(tags).reduce((acc, tag) => {
      if (tag !== 'src' && acc[tag]) throw new Error(
        `Logger tag '${tag}' cannot be extended`
      )
      return {...acc, [tag]: tags[tag]}
    }, this.tags)
    return new Logger(this._subject, newTags)
  }

  log(e: Pick<LoggerEvent, 'level' | 'code' | 'data' | 'metrics'>): void {
    this._subject.next({
      ...e,
      timestamp: Date.now(),
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
    errorOrData?: Error | LoggerEventData,
    data?: LoggerEventData
  ): void {
    this.catch('error', code, errorOrData, data)
  }

  info(code: string, data?: LoggerEventData, metrics?: LoggerEventMetricMutations): void {
    this.log({level: 'info', code, data, metrics})
  }

  warn(
    code: string,
    errorOrData?: Error | LoggerEventData,
    data?: LoggerEventData
  ): void {
    this.catch('warn', code, errorOrData, data)
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

export function matchTags(target: LoggerTags, test: Partial<LoggerTags>, extraTags = false): boolean {
  const result = !Object.keys(test).find(tag => target[tag] !== test[tag])
  if (!result || !extraTags) return result
  return Object.keys(test).length === Object.keys(target).length
}

export function filterByTags(tags: Partial<LoggerTags>): OperatorFunction<LoggerEvent, LoggerEvent> {
  return events => events.pipe(filter(e => matchTags(e.tags, tags)))
}

export function scanMetricList<T extends LoggerMetricItem>(metricName: string): OperatorFunction<LoggerEvent, T[]> {
  return events => events.pipe(
    scan((metrics, e) => {
      const mutation = (e.metrics || {})[metricName] as LoggerEventMetricMutation<T[]>
      if (!mutation) return metrics
      const {$insert, $upsert, $remove, $patch, metricKey} = mutation
      if ($remove) metrics = metrics.filter(data => (
        !$remove.includes((data as unknown as { id: string })[(metricKey || 'id') as 'id'])
      ))
      if ($insert) metrics = [...metrics, ...$insert] as T[]
      if ($upsert) metrics = $upsert.reduce((acc, upsertMetric) => {
        const id = (upsertMetric as unknown as { id: string })[(metricKey || 'id') as 'id']
        const existingData = acc.find(data => (
          (data as unknown as { id: string })[(metricKey || 'id') as 'id'] === id
        ))
        if (existingData) {
          const i = acc.indexOf(existingData)
          return acc.map((existingMetric, j) => i === j ? upsertMetric : existingMetric) as T[]
        }
        return [...acc, upsertMetric] as T[]
      }, metrics)
      if ($patch) metrics = metrics.map(metricData => {
        const id = (metricData as unknown as { id: string })[(metricKey || 'id') as 'id']
        const patchData = $patch.find(_patchData => (
          (_patchData as unknown as { id: string })[(metricKey || 'id') as 'id'] === id
        ))
        if (!patchData) return metricData
        return {...metricData, ...patchData}
      }) as T[]
      return metrics
    }, [] as T[]),
    startWith([] as T[]),
    distinctUntilChanged(),
    shareReplay(1)
  )
}

export default Logger
