import { PREFIX, getContainerContext, ResourceMeta, ResourceOpts, ResourceContext, RESOURCE_CONTEXT_TOKEN } from './common'
import Environment from './environment'
import { PluginMeta } from './plugin'
import Container from 'typedi'
import { ProviderMeta } from './provider'
import { LogMetricValue } from './log'

export interface ModuleMetric extends LogMetricValue {
  name: string,
  status: 'bootstrap' | 'ready',
  plugins: string
}

export interface ModuleOpts<TVars extends Record<string, string> = {}>  extends ResourceOpts<TVars> {
  pluginsAndProviders?: Function[]
}

export abstract class ModuleContext<TVars extends Record<string, string> = {}> extends ResourceContext<TVars> {
  readonly kind: 'module'
  readonly meta: ModuleMeta<TVars>
}

export class ModuleMeta<TVars extends Record<string, string> = {}> extends ResourceMeta<TVars> {
  readonly plugins: PluginMeta[]

  constructor(type: Function, opts: ModuleOpts<TVars>) {
    const {plugins, providers, vars} = (opts.pluginsAndProviders || []).reduce((acc, type) => {
      const pluginMeta = Reflect.getMetadata(`${PREFIX}:plugin`, type) as PluginMeta<TVars>
      if (pluginMeta instanceof PluginMeta) {
        const nextVars = Object.keys(pluginMeta.vars).reduce((acc, key) => ({
          ...acc,
          [key]: acc[key as keyof TVars] || pluginMeta.vars[key]
        }), acc.vars as TVars)
        return {providers: acc.providers, plugins: [...acc.plugins, pluginMeta], vars: nextVars}
      }
      const providerMeta = Reflect.getMetadata(`${PREFIX}:provider`, type) as ProviderMeta
      if (providerMeta instanceof ProviderMeta) {
        return {providers: [...acc.providers, type], plugins: acc.plugins, vars: acc.vars}
      }
      throw new Error('invalid plugin or provider')
    }, {
      plugins: [] as PluginMeta[],
      vars: opts.vars || {} as TVars,
      providers: [] as Function[]
    })
    super(type, {...opts, providers: [...(opts.providers || []), ...providers], vars})
    this.plugins = plugins
  }

  async bootstrap(): Promise<void> {
    const {logger} = getContainerContext()
    logger.metrics(`bootstrap module '${this.name}'`, {
      modules: {
        $insert: [{
          name: this.name,
          status: 'bootstrap',
          plugins: this.plugins.map(pluginMeta => pluginMeta.name).join(',')
        } as ModuleMetric]
      }
    })
    const container = Container.of(this)
    container.set(RESOURCE_CONTEXT_TOKEN, this.buildContext())
    try {
      const mod = container.get(this.type) as { init?: Promise<void> }
      if (!(mod instanceof this.type)) throw new Error('invalid module instance')
      if (mod.init instanceof Promise) await mod.init
    } catch (catched) {
      logger.error('MODULE_BOOTSTRAP_FAILED', catched)
      throw catched
    }
    logger.info('MODULE_READY', {mod: this.name}, {
      modules: {
        $index: 'name',
        $patch: [{name: this.name, status: 'ready'} as Partial<ModuleMetric>]
      }
    })
    await Promise.all(this.plugins.map(pluginMeta => pluginMeta.bootstrap(this)))
  }

  buildContext(): ModuleContext<TVars> {
    const {env, logger} = getContainerContext()
    return {
      kind: 'module',
      name: this.name,
      meta: this,
      logger: logger.extend({src: 'mod', mod: this.name}),
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
