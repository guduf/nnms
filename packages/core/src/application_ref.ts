import Environment from './environment'
import Logger from './logger'
import { ErrorWithCatch } from './errors'
import Container from 'typedi'
import { createLogger, format, transports } from 'winston'

export class ModuleContext<T = {}> {
  mode: 'dev' | 'prod' | 'test'
  log: Logger
  vars: { readonly [P in keyof T]: string }
}

export interface ApplicationOpts {
  name: string
}

export class ApplicationRef {
  readonly env = new Environment()
  readonly logger = this._initLogger()

  static async bootstrap(opts: ApplicationOpts, ...mods: any[]): Promise<void> {
    const appRef = new ApplicationRef(opts.name)

    for (const mod of mods) await appRef._bootstrapModule(mod)
  }

  private constructor(
    readonly name: string
  ) {
    Container.set({type: Environment, value: this.env, global: true})
    Container.set({type: Logger, value: this.env, global: true})
  }

  private _initLogger(): Logger {
    const native =  createLogger({
      level: this.env.isProduction ? 'info' : 'debug',
      transports: [
        new transports.Console({format: format.prettyPrint()})
      ]
    })
    return new Logger(native, [this.name])
  }

  private async _bootstrapModule(
    modCtor: any
  ): Promise<void> {
    const meta = Reflect.getMetadata('nandms:module', modCtor)
    if (!meta) throw new Error(
      `The module class has not been decorated with ModuleRef`
    )
    const vars = this.env.extract(meta.vars, meta.name.toUpperCase())
    const logger = this.logger.extend(meta.name)
    logger.debug('Module is starting', {name: meta.name, vars: Object.keys(meta.vars)})
    const container = Container.of(meta)
    container.set({type: ModuleContext, value: {log: logger, vars}})
    let mod: { bootstrap?: () => Promise<void> }
    try {
      mod = container.get(modCtor)
    } catch (catched) {
      const err = new ErrorWithCatch(`module construct failed`, catched)
      logger.error(err.message, err.catched)
      throw err
    }
    if (typeof mod.bootstrap === 'function') try { await mod.bootstrap() } catch (catched) {
      const err = new ErrorWithCatch(`module bootstrap failed`, catched)
      logger.error(err.message, err.catched)
      throw err
    }
    logger.info('Module is ready')
  }
}

export const bootstrap = ApplicationRef.bootstrap
