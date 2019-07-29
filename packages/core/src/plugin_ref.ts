import { CommonMeta, CommonContext, PREFIX } from './common'
import { Container } from 'typedi'
import { refDecorator } from './di'
import { ModuleContext } from './module_ref'
import { Logger } from './logger'
import { ErrorWithCatch } from './errors'

export class PluginContext<TInstance = {}, TVars extends Record<string, string> = {}> implements CommonContext<TVars> {
  readonly id: string
  readonly mode: 'dev' | 'prod' | 'test'
  readonly logger: Logger
  readonly vars: { readonly [P in keyof TVars]: string }
  readonly instance: TInstance

  constructor(readonly moduleId: string, meta: PluginMeta<TVars>) {
    const {ctx: {mode, vars, logger, meta: modMeta}, instance} = this._getModule(moduleId)
    this.id = `${PREFIX}:module:${modMeta.name}:plugin:${meta.name}`
    this.mode = mode
    this.logger = logger.extend(meta.name)
    this.vars = vars
    this.instance = instance
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

export class PluginMeta<TVars extends Record<string, string> = {}> extends CommonMeta<TVars> { }

export function startPlugins(moduleId: string, plugins: PluginMeta[]) {
  for (const pluginMeta of plugins) {
    const pluginCtx = new PluginContext(moduleId, pluginMeta)
    const pluginContainer = Container.of(pluginCtx.id)
    pluginContainer.set(PluginContext, pluginCtx)
    try {
      pluginContainer.get(pluginMeta.type)
    } catch (catched) {
      const err = new ErrorWithCatch(`plugin construct failed`, catched)
      pluginCtx.logger.error(err.message, err.catched)
      throw err
    }
  }
}

export const PluginRef = refDecorator('plugin', PluginMeta)
