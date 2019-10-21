import { LogMetricMutation } from './log_metric'
import { Log, LogData, LogTags, LogLevel } from './log'

export class Logger {
  constructor(
    readonly tags: LogTags,
    private readonly _consumer: (e: Log) => void
  ) { }

  catch(
    level: LogLevel,
    code: string,
    dataOrError = {} as Error | LogData
  ): void {
    const data = dataOrError instanceof Error ? {msg: dataOrError.message} : dataOrError
    this.log({level, code, data, metrics: undefined})
  }

  extend(tags: LogTags): Logger {
    if (tags.src === this.tags.src) throw new Error(
      `logger cannot extend the same src '${tags.src}'`
    )
    const newTags = Object.keys(tags).reduce((acc, tag) => {
      if (tag !== 'src' && acc[tag]) throw new Error(
        `logger tag '${tag}' cannot be extended`
      )
      return {...acc, [tag]: tags[tag]}
    }, this.tags)
    return new Logger(newTags, this._consumer)
  }

  log(e: Pick<Log, 'level' | 'code' | 'data' | 'metrics'>): void {
    this._consumer(Log.create({...e, tags: this.tags}))
  }

  debug(data?: string | LogData): void {
    this.log({
      level: 'DBG',
      code: '*DEBUG',
      data: typeof data === 'string' ? {message: data} : data,
      metrics: undefined
    })
  }

  error(code: string, errorOrData?: Error | LogData): void {
    this.catch('ERR', code, errorOrData)
  }

  info(code: string, data?: LogData, metrics?: Record<string, LogMetricMutation>): void {
    this.log({level: 'INF', code, data, metrics})
  }

  warn(code: string, errorOrData?: Error | LogData): void {
    this.catch('WAR', code, errorOrData)
  }

  metrics(
    messageOrMetrics: string | Record<string, LogMetricMutation>,
    metrics?: Record<string, LogMetricMutation>
  ): void {
    const message = typeof messageOrMetrics === 'string' ? messageOrMetrics : undefined
    metrics = typeof messageOrMetrics === 'string' ? metrics : messageOrMetrics
    this.log({level: 'DBG', code: '*METRIC', metrics, data: message ? {message} : {}})
  }
}

export default Logger
