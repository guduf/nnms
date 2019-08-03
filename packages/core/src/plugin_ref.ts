import { PREFIX } from './common'
import { Container } from 'typedi'
import { getPluginMeta } from './di'
import { ModuleContext } from './module_ref'
import { Logger } from './logger'
import { ProviderMeta, refDecorator, ProviderContext } from './provider'

export class PluginContext<TVars extends Record<string, string> = {}, TInstance = any> implements ProviderContext<TVars> {
  readonly id: string
  readonly mode: 'dev' | 'prod' | 'test'
  readonly logger: Logger
  readonly vars: { readonly [P in keyof TVars]: string }
  readonly instance: TInstance
  readonly methods: { meta: unknown, func: Function }[]

  constructor(readonly moduleId: string, readonly meta: PluginMeta<TVars>) {
    const {ctx: {mode, vars, logger, meta: modMeta}, instance} = this._getModule(moduleId)
    this.id = `${PREFIX}:module:${modMeta.name}:plugin:${meta.name}`
    this.mode = mode
    this.logger = logger.extend(meta.name)
    this.vars = vars
    this.instance = instance
    const methodMetas = getPluginMeta(this.meta.name, instance)
    this.methods = Object.keys(methodMetas).reduce((acc, key) => [
      ...acc,
      {meta: methodMetas[key], func: (instance as any)[key].bind(instance)}
    ], [] as { meta: unknown, func: Function }[])
  }

  private _getModule(moduleId: string): { ctx: ModuleContext<TVars>, instance: TInstance } {
    const modContainer = Container.of(moduleId)
    if (!modContainer.has(ModuleContext as any)) throw new Error('Missing Module Context')
    const ctx = modContainer.get(ModuleContext) as ModuleContext<TVars>
    if (!(ctx instanceof ModuleContext)) throw new Error('Invalid Module Context')
    const instance = modContainer.get(ctx.meta.type) as TInstance
    if (!(instance instanceof ctx.meta.type)) throw new Error('Invalid instance')
    return {ctx, instance}
  }
}

export class PluginMeta<TVars extends Record<string, string> = {}> extends ProviderMeta<TVars> { }

export const PluginRef = refDecorator('plugin', PluginMeta)
