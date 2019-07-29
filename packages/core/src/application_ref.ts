import Environment from './environment'
import Logger from './logger'
import Container from 'typedi'
import { createLogger, format, transports } from 'winston'
import { startModule } from './module_ref'
import { startProviders } from './provider'

export interface ApplicationOpts {
  name: string
  providers?: Function[]
}

export class ApplicationContext {
  readonly env = new Environment()
  readonly logger = this._initLogger()

  static async bootstrap(opts: ApplicationOpts, ...mods: any[]): Promise<void> {
    if (Container.has(ApplicationContext as any)) {
      throw new Error('Container has another ApplicationRef setted')
    }
    const appRef = new ApplicationContext(opts.name)
    Container.set({type: ApplicationContext, global: true, value: appRef})
    const hook = opts.providers ? startProviders(opts.providers) : async () => { }
    await Promise.all(mods.map(mod => startModule(mod)))
    await hook()
  }

  private constructor(
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

export function getApplicationRef(): ApplicationContext {
  if (!Container.has(ApplicationContext as any)) throw new Error('Container has no ApplicationRef')
  const appRef = Container.get(ApplicationContext as any) as ApplicationContext
  if (!(appRef instanceof ApplicationContext)) throw new Error('ApplicationRef is not valid instance')
  return appRef
}

export function bootstrap(name: string, ...mods: any): Promise<void> {
  return ApplicationContext.bootstrap({name}, ...mods).catch(err => {
    console.error('CRASH', err)
    process.exit(1)
  })
}
