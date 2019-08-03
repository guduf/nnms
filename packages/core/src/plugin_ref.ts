import { PREFIX, getPluginMeta } from './common'
import { ContainerInstance } from 'typedi'
import { ModuleMeta, ModuleContext } from './module_ref'
import { ProviderMeta, ProviderContext } from './provider'

export abstract class PluginContext<TVars extends Record<string, string> = {}, T = {}> extends ProviderContext<TVars> {
  readonly meta: PluginMeta<TVars>
  readonly moduleMeta: ModuleMeta
  readonly moduleInstance: T
  readonly moduleMethods: { meta: unknown, func: Function }[]
}

export class PluginMeta<TVars extends Record<string, string> = {}> extends ProviderMeta<TVars> {
  inject(): any {
    throw new Error(`plugin '${this.name}' cannot be injected`)
  }

  injectContext<T>(container: ContainerInstance): PluginContext<TVars, T> {
    if (!(container.id instanceof ModuleMeta)) throw new Error('container is not module scoped')
    if (!container.has(ModuleContext as any)) throw new Error('container has no module context')
    const modCtx = container.get(ModuleContext as any) as ModuleContext<TVars>
    if (!container.has(modCtx.meta.type)) throw new Error('container has no module instance')
    const moduleInstance = container.get(modCtx.meta.type) as T
    const methodMetas = getPluginMeta(this.name, moduleInstance as any)
    const moduleMethods = Object.keys(methodMetas).reduce((acc, key) => [
      ...acc,
      {meta: methodMetas[key], func: (moduleInstance as any)[key].bind(moduleInstance)}
    ], [] as { meta: unknown, func: Function }[])
    return {
      id: `${PREFIX}:module:${this.name}`,
      meta: this,
      mode: modCtx.mode,
      logger: modCtx.logger.extend(this.name),
      vars: modCtx.vars,
      moduleMeta: modCtx.meta,
      moduleMethods,
      moduleInstance
    }
  }
}

