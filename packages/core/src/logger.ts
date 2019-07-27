import winston from 'winston'

export interface LoggerConfig {
  baseUri?: string[]
  isProduction: boolean
}

export type LoggerLevel = 'error' | 'warn' | 'info' | 'debug'

export const LOGGER_LEVELS: { [level in LoggerLevel]: { color: string} } = {
  error: {color: 'red'},
  warn: {color: 'yellow'},
  info: {color: 'cyan'},
  debug: {color: 'white'}
}

export interface LoggerEvent<T = {}> extends winston.LogEntry {
  level: LoggerLevel
  uri: string[]
  message: string
  data?: T
}

export class Logger {
  constructor(
    protected readonly _native: winston.Logger,
    protected readonly _uri: string[]
  ) { }

  catch(
    level: 'debug' | 'error' | 'warn',
    messageOrError: string | Error,
    errorOrData?: Error | {},
    data = {}
  ): void {
    const error = (
      messageOrError instanceof Error ? messageOrError :
        errorOrData instanceof Error ? errorOrData :
          null
    )
    const message = (
      typeof messageOrError === 'string' && messageOrError ? messageOrError :
        error ? error.message :
          'INVALID_ERROR_LOG'
    )
    data = errorOrData instanceof Error ? data : errorOrData as {}
    this.log({level, message, data: error ? {$catched: error.message} : undefined})
  }

  extend(...uri: string[]): Logger {
    return new Logger(this._native, [...this._uri, ...uri])
  }

  log(e: Partial<LoggerEvent> & { level: LoggerLevel, message: string }): void {
    this._native.log({uri: this._uri, ...e})
  }

  debug(message: string, data?: {}): void {
    this.log({level: 'debug', message, data})
  }

  error(messageOrError: string | Error, errorOrData?: Error | {}, data = {}): void {
    this.catch('error', messageOrError, errorOrData, data)
  }

  info(message: string, data?: {}): void {
    this.log({level: 'info', message, data})
  }

  warn(messageOrError: string | Error, errorOrData?: Error | {}, data = {}): void {
    this.catch('warn', messageOrError, errorOrData, data)
  }
}

export function bootstrapLogger(cfg: LoggerConfig): Logger {
  const native =  winston.createLogger({
    level: cfg.isProduction  ? 'info' : 'debug',
    format: winston.format.prettyPrint()
  })
  return new Logger(native, cfg.baseUri || ['root'])
}

export default Logger
