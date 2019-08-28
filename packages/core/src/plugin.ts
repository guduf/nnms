import { ModuleMeta, ModuleContext } from './module_ref'
import { ResourceContext, ResourceMeta, PREFIX, getMethodPluginMetas, getContainerContext } from './common'
import Container, { ContainerInstance } from 'typedi'
import { ErrorWithCatch } from './errors'

export interface PluginMetric {
  name: string,
  module: string
  plugin: string
}

export abstract class PluginContext<TVars extends Record<string, string> = {}, T = {}> extends ResourceContext<TVars> {
  readonly kind: 'plugin'
  readonly meta: PluginMeta<TVars>
  readonly moduleMeta: ModuleMeta
  readonly moduleInstance: T
  readonly moduleMethods: { prop: string, meta: unknown, func: (...args: any[]) => Promise<unknown> }[]
  readonly moduleParams: { meta: unknown, type: any, index: number }[]
}

export class PluginMeta<TVars extends Record<string, string> = {}> extends ResourceMeta<TVars> {
  inject(): any {
    throw new Error(`plugin '${this.name}' cannot be injected`)
  }

  buildContext<T>(container: ContainerInstance): PluginContext<TVars, T> {
    const modCtx = getContainerContext(container) as ModuleContext<TVars>
    const {name: modName, type: modType} = modCtx.meta
    const moduleInstance = Container.of(modCtx.meta).get(modType) as T
    const paramTypes = Reflect.getMetadata('design:paramtypes', modType) as any[] || []
    const moduleParams = paramTypes.map((paramType, index) => ({
      meta: Reflect.getMetadata(`${PREFIX}:plugin:${this.name}`, modType, `constructor[${index}]`) || null,
      type: paramType,
      index
    }))
    const methodMetas = getMethodPluginMetas(this.name, moduleInstance as any)
    const moduleMethods = Object.keys(methodMetas).reduce((acc, prop) => [
      ...acc,
      {prop, meta: methodMetas[prop], func: (moduleInstance as any)[prop].bind(moduleInstance)}
    ], [] as { prop: string, meta: unknown, func: (...args: any[]) => Promise<unknown> }[])
    return {
      kind: 'plugin',
      name: `${modName}+${this.name}`,
      meta: this,
      mode: modCtx.mode,
      logger: modCtx.logger.extend({resource: 'plug', plug: this.name}),
      vars: modCtx.vars,
      moduleMeta: modCtx.meta,
      moduleMethods,
      moduleInstance,
      moduleParams
    }
  }

  async bootstrap(modMeta: ResourceMeta): Promise<void> {
    const {logger} = getContainerContext()
    const container = Container.of(modMeta)
    try {
      const plugin = container.get(this.type) as { init?: Promise<void> }
      if (!(plugin instanceof this.type)) throw new Error('invalid plugin instance')
      if (plugin.init instanceof Promise) await plugin.init
      logger.info('PLUGIN_READY', {mod: modMeta.name, plug: this.name}, {
        plugins: {$add: [{name: `${modMeta.name}+${this.name}`, plugin: this.name, module: modMeta.name} as PluginMetric]}
      })
    } catch (catched) {
      const err = new ErrorWithCatch(`plugin '${modMeta.name}+${this.name}' init failed`, catched)
      logger.error('PLUGIN_BOOTSTRAP_FAILED', err.message, err.catched)
      throw err
    }
  }
}
