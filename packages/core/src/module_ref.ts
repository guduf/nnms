import Container from 'typedi'

import { PREFIX, getApplicationContext, getMethodPluginMetas } from './common'
import Environment from './environment'
import { ProviderMeta, ProviderOpts, ProviderContext } from './provider'

export abstract class PluginContext<TVars extends Record<string, string> = {}, T = {}> extends ProviderContext<TVars> {
  readonly meta: PluginMeta<TVars>
  readonly moduleMeta: ModuleMeta
  readonly moduleInstance: T
  readonly moduleMethods: { prop: string, meta: unknown, func: (...args: any[]) => Promise<unknown> }[]
  readonly moduleParams: { meta: unknown, type: any, index: number }[]
}

export class PluginMeta<TVars extends Record<string, string> = {}> extends ProviderMeta<TVars> {
  inject(): any {
    throw new Error(`plugin '${this.name}' cannot be injected`)
  }

  buildContext(): ProviderContext {
    throw new Error('buildContext can\'t be used in PluginMeta')
  }

  buildPluginContext<T>(modMeta: ModuleMeta): PluginContext<TVars, T> {
    const appCtx = getApplicationContext()
    const modCtx = appCtx.state.mods[modMeta.name].context as ModuleContext<TVars>
    const moduleInstance = Container.of(modMeta).get(modMeta.type) as T
    const paramTypes = Reflect.getMetadata('design:paramtypes', modMeta.type) as any[] || []
    const moduleParams = paramTypes.map((paramType, index) => ({
      meta: Reflect.getMetadata(`${PREFIX}:plugin:${this.name}`, modMeta.type, `constructor[${index}]`) || null,
      type: paramType,
      index
    }))
    const methodMetas = getMethodPluginMetas(this.name, moduleInstance as any)
    const moduleMethods = Object.keys(methodMetas).reduce((acc, prop) => [
      ...acc,
      {prop, meta: methodMetas[prop], func: (moduleInstance as any)[prop].bind(moduleInstance)}
    ], [] as { prop: string, meta: unknown, func: (...args: any[]) => Promise<unknown> }[])
    return {
      id: `${PREFIX}:module:${this.name}`,
      meta: this,
      mode: modCtx.mode,
      logger: modCtx.logger.extend(this.name),
      vars: modCtx.vars,
      moduleMeta: modCtx.meta,
      moduleMethods,
      moduleInstance,
      moduleParams
    }
  }
}

export interface ModuleOpts<TVars extends Record<string, string> = {}>  extends ProviderOpts<TVars> {
  plugins?: Function[]
}

export abstract class ModuleContext<TVars extends Record<string, string> = {}> extends ProviderContext<TVars> {
  readonly meta: ModuleMeta<TVars>
}

export class ModuleMeta<TVars extends Record<string, string> = {}> extends ProviderMeta<TVars> {
  readonly plugins: PluginMeta[]

  constructor(type: Function, opts: ModuleOpts<TVars>) {
    const {metas, vars} = (opts.plugins || []).reduce((acc, pluginType) => {
      const pluginMeta = Reflect.getMetadata(`${PREFIX}:plugin`, pluginType) as PluginMeta<TVars>
      if (!(pluginMeta instanceof PluginMeta)) throw new Error('invalid plugin')
      const nextVars = Object.keys(pluginMeta.vars).reduce((acc, key) => ({
        ...acc,
        [key]: acc[key as keyof TVars] || pluginMeta.vars[key]
      }), acc.vars as TVars)
      return {metas: [...acc.metas, pluginMeta], vars: nextVars}
    }, {metas: [] as PluginMeta[], vars: opts.vars || {} as TVars})
    super(type, {...opts, vars})
    this.plugins = metas
  }

  inject(): any {
    throw new Error(`module cannot be injected`)
  }

  buildContext(): ModuleContext<TVars> {
    const {env, logger} = getApplicationContext()
    return {
      id: `${PREFIX}:module:${this.name}`,
      meta: this,
      mode: env.isProduction ? 'prod' : 'dev',
      logger: logger.extend(this.name),
      vars: env.extract(this.vars, this.name.toUpperCase())
    }
}

  getVars(env: Environment): TVars {
    const prefix = this.name.toUpperCase()
    const pluginsVarsTpl = this.plugins.reduce((acc, {vars}) => ({
      ...acc,
      ...vars
    }), {} as { [envVar: string]: string })
    return env.extract({...pluginsVarsTpl, ...this.vars}, prefix)
  }
}
