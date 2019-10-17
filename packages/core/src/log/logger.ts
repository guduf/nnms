import { LogMetricMutation } from './log_metric'
import { Log, LogData, LoggerTags, LogLevel } from './log'

export class Logger {
  private constructor(
    private readonly _consumer: (e: Log) => void,
    readonly tags: LoggerTags
  ) { }

  catch(
    lvl: LogLevel,
    code: string,
    dataOrError = {} as Error | LogData
  ): void {
    const data = dataOrError instanceof Error ? {msg: dataOrError.message} : dataOrError
    this.log({lvl, code, data})
  }

  extend(tags: LoggerTags): Logger {
    if (tags.src === this.tags.src) throw new Error(
      `logger cannot extend the same src '${tags.src}'`
    )
    const newTags = Object.keys(tags).reduce((acc, tag) => {
      if (tag !== 'src' && acc[tag]) throw new Error(
        `logger tag '${tag}' cannot be extended`
      )
      return {...acc, [tag]: tags[tag]}
    }, this.tags)
    return new Logger(this._consumer, newTags)
  }

  log(e: Pick<Log, 'lvl' | 'code' | 'data' | 'metrics'>): void {
    this._consumer({...e, tags: this.tags})
  }

  debug(data?: string | LogData): void {
    this.log({
      lvl: 'DBG',
      code: '*DEBUG',
      data: typeof data === 'string' ? {message: data} : data
    })
  }

  error(
    code: string,
    errorOrData?: Error | LogData
  ): void {
    this.catch('ERR', code, errorOrData)
  }

  info(code: string, data?: LogData, metrics?: Record<string, LogMetricMutation>): void {
    this.log({lvl: 'INF', code, data, metrics})
  }

  warn(
    code: string,
    errorOrData?: Error | LogData
  ): void {
    this.catch('WAR', code, errorOrData)
  }

  metrics(
    messageOrMetrics: string | Record<string, LogMetricMutation>,
    metrics?: Record<string, LogMetricMutation>
  ): void {
    const message = typeof messageOrMetrics === 'string' ? messageOrMetrics : undefined
    metrics = typeof messageOrMetrics === 'string' ? metrics : messageOrMetrics
    this.log({lvl: 'DBG', code: '*METRIC', metrics, data: message ? {message} : {}})
  }
}

export default Logger
