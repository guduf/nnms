import Environment from './environment'
import Logger from './logger'
import { createLogger, format, transports } from 'winston'
import Transport from 'winston-transport'

export interface ApplicationOpts {
  name: string
  loggerTransports?: Transport[]
}

export class ApplicationContext {
  readonly env = new Environment()
  readonly logger: Logger

  constructor(
    readonly name: string,
    loggerTransports: Transport[] = [new transports.Console({format: format.prettyPrint()})]
  ) {
    this.logger = this._initLogger(loggerTransports)
  }

  private _initLogger(transports: Transport[]): Logger {
    const native =  createLogger({
      level: this.env.isProduction ? 'info' : 'debug',
      transports
    })
    return new Logger(native, [this.name])
  }
}
