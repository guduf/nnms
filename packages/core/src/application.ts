import { Observable } from 'rxjs'
import Container from 'typedi'
import Transport from 'winston-transport'
import { createLogger, format, transports } from 'winston'

import ApplicationBackground, { ApplicationState } from './background'
import { PREFIX } from './common'
import Environment from './environment'
import { ErrorWithCatch } from './errors'
import Logger from './logger'
import { ModuleMeta } from './module_ref'
import { ProviderMeta } from './provider'

export interface ApplicationOpts {
  name: string
  loggerTransports?: Transport[]
}

export class ApplicationContext {
  readonly env = new Environment()
  readonly logger = this._initLogger()

  get state(): ApplicationState {
    return this._background.value
  }

  get stateChanges(): Observable<ApplicationState> {
    return this._background.changes
  }

  private readonly _background = new ApplicationBackground()

  static bootstrap(opts: { name: string, loggerTransports?: Transport[] }, ...mods: Function[]): ApplicationContext {
    const appCtx = new ApplicationContext(opts.name, opts.loggerTransports || [])
    appCtx.bootstrap(...mods)
    return appCtx
  }

  private constructor(
    readonly name: string,
    readonly loggerTransports: Transport[] = [new transports.Console({format: format.prettyPrint()})]
  ) { }

  private _initLogger(): Logger {
    const native = createLogger({
      level: this.env.isProduction ? 'info' : 'debug',
      transports: this.loggerTransports
    })
    return new Logger(native, [this.name])
  }

  private async _bootstrapModule(meta: ModuleMeta): Promise<void> {
    this._background.registerModule(meta)
    this.logger.debug(`bootstrap module '${meta.name}'`)
    const container = Container.of(meta)
    try {
      const mod = container.get(meta.type) as { init?: Promise<void> }
      if (!(mod instanceof meta.type)) throw new Error('invalid module instance')
      if (mod.init instanceof Promise) await mod.init
      this._background.initModule(meta)
      this.logger.info(`module '${meta.name}' is ready`)
    } catch (catched) {
      const err = new ErrorWithCatch(`module '${meta.name}'init failed`, catched)
      this.logger.error(err.message, err.catched)
      throw err
    }
    await Promise.all(meta.plugins.map(async (pluginMeta) => {
      try {
        this._background.registerPlugin(meta, pluginMeta)
        const plugin = container.get(pluginMeta.type) as { init?: Promise<void> }
        if (!(plugin instanceof pluginMeta.type)) throw new Error('invalid plugin instance')
        if (plugin.init instanceof Promise) await plugin.init
        this._background.initPlugin(meta, pluginMeta)
        this.logger.info(`plugin '${pluginMeta.name}' of module '${meta.name}' is ready`)
      } catch (catched) {
        const err = new ErrorWithCatch(`plugin init failed`, catched)
        this.logger.error(err.message, err.catched)
        throw err
      }
    }))
  }

  private async _bootstrapProvider(meta: ProviderMeta): Promise<void> {
    this._background.registerProvider(meta)
    this.logger.debug(`bootstrap provider '${meta.name}'`)
    let provider: { init?: Promise<void> }
    try {
      provider = Container.get(meta.type)
      if (provider.init instanceof Promise) await provider.init
      this._background.initProvider(meta)
      this.logger.info(`provider '${meta.name}' is ready`)
    } catch (catched) {
      const err = new ErrorWithCatch(`provider init failed`, catched)
      this.logger.error(err.message, err.catched)
      throw err
    }
  }

  async bootstrap(
    ...mods: Function[]
  ): Promise<void> {
    this._background.setStatus('BOOTSTRAP')
    this.logger.info(`bootstrap application`)
    if (Container.has(ApplicationContext as any)) {
      throw new Error('global container has another ApplicationContext')
    }
    Container.set({type: ApplicationContext, global: true, value: this})
    const metas = mods.reduce((acc, modType) => {
      const modMeta = Reflect.getMetadata(`${PREFIX}:module`, modType)
      if (!(modMeta instanceof ModuleMeta)) throw new Error('invalid module')
      return {
        mods: acc.mods.includes(modMeta) ? acc.mods : [...acc.mods, modMeta],
        providers: [...modMeta.plugins, ...modMeta.providers]
          .reduce((subAcc, subMeta) => (
            [...subAcc, ...subMeta.providers]
          ), modMeta.providers)
          .reduce((provAcc, provMeta) => (
            provAcc.includes(provMeta) ? provAcc : [...provAcc, provMeta]
          ), acc.providers)
      }
    }, { mods: [] as ModuleMeta[], providers: [] as ProviderMeta[] })
    await Promise.all(metas.providers.map(prov => this._bootstrapProvider(prov)))
    await Promise.all(metas.mods.map(mod => this._bootstrapModule(mod)))
    this._background.setStatus('STARTED')
    this.logger.info('application is ready', {
      providers: metas.providers.map(({name}) => name),
      modules: metas.mods.reduce((acc, {name, plugins}) => ({
        ...acc,
        [name]: plugins.map(plugin => plugin.name)
      }), {})
    })
  }
}

export const bootstrap = ApplicationContext.bootstrap
