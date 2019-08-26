import { Logger as WinstonLogger, LogEntry } from 'winston'

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

export interface Tags {
  resource: 'app' | 'mod' | 'prov' | 'plug'
  [tag: string]: string
}

export interface LoggerEventData {
  message?: string
  [key: string]: any
}

export interface LoggerEventMetrics {
  'table-add'?: { table: string, data: any }[]
  'table-remove'?: { table: string, tableKey?: string, key: string }[]
  'table-patch'?: { table: string, tableKey?: string, data: any }[]
}

export interface LoggerEvent<T extends LoggerEventData = LoggerEventData> extends LogEntry {
  level: LoggerLevel
  code: string
  tags: Tags
  data?: T
  metrics?: LoggerEventMetrics
}

export class Logger {
  constructor(
    protected readonly _native: WinstonLogger,
    protected readonly _tags: Tags
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

  extend(tags: Tags): Logger {
    if (tags.resource === this._tags.resource) throw new Error(
      `Logger cannot extend the same resource '${tags.resource}'`
    )
    const newTags = Object.keys(tags).reduce((acc, tag) => {
      if (tag !== 'resource' && acc[tag]) throw new Error(`Logger tag '${tag}' cannot be extended`)
      return {...acc, [tag]: tags[tag]}
    }, this._tags)
    return new Logger(this._native, newTags)
  }

  log(e: Pick<LoggerEvent, 'level' | 'code' | 'data' | 'metrics'>): void {
    this._native.log({
      ...e,
      message: (e.data || {message : ''}).message || e.code,
      tags: this._tags
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

  info(code: string, data?: LoggerEventData, metrics?: LoggerEventMetrics): void {
    this.log({level: 'info', code, data, metrics})
  }

  warn(
    code: string,
    messageOrError: string | Error,
    errorOrData?: Error | {},
    data?: LoggerEventData
  ): void {
    this.catch('warn', code, messageOrError, errorOrData, data)
  }
}

export default Logger
