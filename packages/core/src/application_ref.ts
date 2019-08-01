import Environment from './environment'
import Logger from './logger'
import { createLogger, format, transports } from 'winston'

export interface ApplicationOpts {
  name: string
  providers?: Function[]
}

export class ApplicationContext {
  readonly env = new Environment()
  readonly logger = this._initLogger()

  constructor(
    readonly name: string
  ) { }

  private _initLogger(): Logger {
    const native =  createLogger({
      level: this.env.isProduction ? 'info' : 'debug',
      transports: [
        new transports.Console({format: format.prettyPrint()})
      ]
    })
    return new Logger(native, [this.name])
  }
}
