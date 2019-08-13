import { BehaviorSubject, defer } from 'rxjs'
import Transport from 'winston-transport'
import { createLogger, format, transports } from 'winston'

import Environment from './environment'
import Logger from './logger'
import { ProviderContext, ProviderMeta } from './provider'
import { ModuleContext, PluginContext, ModuleMeta, PluginMeta } from './module_ref'

export interface ApplicationOpts {
  name: string
  loggerTransports?: Transport[]
}

export interface ModuleBackground {
  init: boolean
  context: ModuleContext<{}>
  plugins: { [name: string]: { init: boolean, context: PluginContext<{}> }
  }
}

export interface ProviderBackground {
  init: boolean
  context: ProviderContext<{}>
}

export abstract class ApplicationBackground {
  status: 'bootstrap' | 'bootstrapProviders' | 'bootstrapModules' | 'started'
  mods: { [name: string]: ModuleBackground }
  providers: { [name: string]: ProviderBackground }
}

const INITIAL_BACKGROUND = {
  status: 'bootstrap',
  mods: {},
  providers: {}
} as ApplicationBackground

export class ApplicationContext {
  readonly env = new Environment()
  readonly logger: Logger
  readonly backgroundChanges = defer(() => this._background)

  get background(): ApplicationBackground {
    return this._background.value
  }

  private readonly _background = new BehaviorSubject(INITIAL_BACKGROUND)

  constructor(
    readonly name: string,
    loggerTransports: Transport[] = [new transports.Console({format: format.prettyPrint()})]
  ) {
    this.logger = this._initLogger(loggerTransports)
  }

  registerModule(meta: ModuleMeta, init = false): void {
    this._background.next({
      ...this.background,
      mods: {...this.background.mods, [meta.name]: {init, context: meta.buildContext(), plugins: {}}}
    })
  }

  initModule(modMeta: ModuleMeta): void {
    this._background.next({
      ...this.background,
      mods: {
        ...this.background.mods,
        [modMeta.name]: {...this.background.mods[modMeta.name], init: true}
      }
    })
  }

  registerPlugin(modMeta: ModuleMeta, meta: PluginMeta, init = false): void {
    const plugins = {
      ...this.background.mods[modMeta.name].plugins,
      [meta.name]: {context: meta.buildPluginContext<{}>(modMeta), init}
    }
    this._background.next({
      ...this.background,
      mods: {
        ...this.background.mods,
        [modMeta.name]: {...this.background.mods[modMeta.name], plugins}
      }
    })
  }

  initPlugin(modMeta: ModuleMeta, meta: PluginMeta): void {
    const plugins = {
      ...this.background.mods[modMeta.name].plugins,
      [meta.name]: {...this.background.mods[modMeta.name].plugins[meta.name], init: true}
    }
    this._background.next({
      ...this.background,
      mods: {
        ...this.background.mods,
        [modMeta.name]: {...this.background.mods[modMeta.name], plugins}
      }
    })
  }

  registerProvider(meta: ProviderMeta, init = false): void {
    this._background.next({
      ...this.background,
      providers : {
        ...this.background.providers,
        [meta.name]: {init, context: meta.buildContext()}
      }
    })
  }

  initProvider(meta: ProviderMeta): void {
    this._background.next({
      ...this.background,
      providers : {
        ...this.background.providers,
        [meta.name]: {...this.background.providers[meta.name], init: true}
      }
    })
  }

  private _initLogger(transports: Transport[]): Logger {
    const native =  createLogger({
      level: this.env.isProduction ? 'info' : 'debug',
      transports
    })
    return new Logger(native, [this.name])
  }
}
