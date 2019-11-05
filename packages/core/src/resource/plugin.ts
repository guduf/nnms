import Container, { ContainerInstance } from 'typedi'

import { injectContext } from '../di'
import { LogMetricValue } from '../log'
import { ModuleMeta, ModuleContext } from './module'
import { ResourceContext, ResourceMeta } from './resource'
import { defineResourceMeta } from './resource_di'

export interface PluginMetric extends LogMetricValue {
  name: string,
  module: string
  plugin: string
}

export abstract class PluginContext<TVars extends Record<string, string> = {}, T = {}> extends ResourceContext<TVars> {
  readonly kind: 'plugin'
  readonly meta: PluginMeta<TVars>
  readonly moduleMeta: ModuleMeta
  readonly moduleInstance: T
}

export class PluginMeta<TVars extends Record<string, string> = {}> extends ResourceMeta<TVars> {
  inject(): any {
    throw new Error(`plugin '${this.name}' cannot be injected`)
  }

  buildContext<T>(container: ContainerInstance): PluginContext<TVars, T> {
    const modCtx = injectContext(container) as ModuleContext<TVars>
    const {name: modName, target: modType} = modCtx.meta
    const moduleInstance = Container.of(modCtx.meta).get(modType) as T

    const plugTags = {src: 'plug', plug: `${modName}+${this.name}`}
    return {
      kind: 'plugin',
      name: `${modName}+${this.name}`,
      meta: this,
      crash: (err, tags) => modCtx.crash(err, {...plugTags, ...tags}),
      logger: modCtx.logger.extend(plugTags),
      vars: modCtx.vars,
      moduleMeta: modCtx.meta,
      moduleInstance
    }
  }

  async bootstrap(modMeta: ResourceMeta): Promise<void> {
    const {logger} = injectContext()
    const container = Container.of(modMeta)
    try {
      const plugin = container.get(this.target) as { init?: Promise<void> }
      if (!(plugin instanceof this.target)) throw new Error('invalid plugin instance')
      if (plugin.init instanceof Promise) await plugin.init
      logger.info('PLUGIN_READY', {mod: modMeta.name, plug: this.name}, {
        plugins: {insert: [{name: `${modMeta.name}+${this.name}`, plugin: this.name, module: modMeta.name} as PluginMetric]}
      })
    } catch (catched) {
      logger.error('PLUGIN_BOOTSTRAP_FAILED', catched)
      throw catched
    }
  }
}

/** Decorates a class with plugin meta. */
export const Plugin = (name: string, vars: Record<string, string>, ...providers: Function[]) => (
  defineResourceMeta('plugin', PluginMeta)({name, vars, providers})
)
