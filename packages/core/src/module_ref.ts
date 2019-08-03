import { PREFIX, getApplicationRef } from './common'
import Environment from './environment'
import { PluginMeta } from './plugin_ref'
import { ProviderMeta, ProviderOpts, ProviderContext } from './provider'
import Container, { ContainerInstance } from 'typedi'

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

  injectContext(container: ContainerInstance): ModuleContext<TVars> {
    if (
      container.id !== this ||
      !container.has(ModuleContext as any)
    ) throw new Error('invalid module container')
    return container.get(ModuleContext as any) as ModuleContext<TVars>
  }

  buildContext(container: ContainerInstance): ModuleContext<TVars> {
    if (container !== Container.of(this)) throw new Error('invalid module container')
    const {env, logger} = getApplicationRef()
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

