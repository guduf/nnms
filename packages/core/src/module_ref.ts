import { getClassMeta, refDecorator } from './di'
import { CommonMeta, CommonOpts, CommonContext, PREFIX } from './common'
import { getApplicationRef } from './application_ref'
import { Container } from 'typedi'
import Environment from './environment'
import { PluginMeta, PluginContext } from './plugin_ref'
import Logger from './logger'
import { ErrorWithCatch } from 'src'

export class ModuleContext<TVars extends Record<string, string> = {}> implements CommonContext<TVars> {
  readonly id: string
  readonly mode: 'dev' | 'prod' | 'test'
  readonly logger: Logger
  readonly vars: { readonly [P in keyof TVars]: string }

  constructor(readonly meta: ModuleMeta<TVars>) {
    const {env, logger} = getApplicationRef()
    this.id = `${PREFIX}:module:${meta.name}`
    this.mode = env.isProduction ? 'prod' : 'dev'
    this.logger = logger.extend(meta.name)
    this.vars = meta.getVars(env)
  }
}

export interface ModuleOpts<TVars extends Record<string, string> = {}>  extends CommonOpts<TVars> {
  plugins?: Function[]
}

export class ModuleMeta<TVars extends Record<string, string> = {}> extends CommonMeta<TVars> {
  readonly plugins: PluginMeta[]

  constructor(type: Function, opts: ModuleOpts<TVars>) {
    super(type, opts)
    this.plugins = (opts.plugins || []).map(type => getClassMeta('plugin', type))
  }

  async bootstrap(): Promise<void> {
    const ctx = new ModuleContext(this)
    const moduleContainer = Container.of(ctx.id)
    moduleContainer.set(ModuleContext, ctx)
    let mod: { bootstrap?: () => Promise<void> }
    try {
      mod = moduleContainer.get(this.type)
    } catch (catched) {
      const err = new ErrorWithCatch(`module bootstrap failed`, catched)
      ctx.logger.error(err.message, err.catched)
      throw err
    }
    if (!(mod instanceof this.type)) throw new Error('Invalid module instance')
    const pluginBootstraps = this._startPlugins(ctx)
    if (typeof mod.bootstrap === 'function') try {
      mod.bootstrap()
    } catch (catched) {
      const err = new ErrorWithCatch(`module bootstrap failed`, catched)
      ctx.logger.error(err.message, err.catched)
      throw err
    }
    for (const pluginBootstrap of pluginBootstraps) await pluginBootstrap()
  }

  private _startPlugins(ctx: ModuleContext<TVars>): (() => Promise<void>)[] {
    const pluginBootstraps = [] as (() => Promise<void>)[]
    for (const pluginMeta of this.plugins) {
      const pluginCtx = new PluginContext(ctx.id, pluginMeta)
      const pluginContainer = Container.of(pluginCtx.id)
      pluginContainer.set(PluginContext, ctx)
      let plugin: { bootstrap?: () => Promise<void> }
      try {
        plugin = pluginContainer.get(pluginMeta.type)
      } catch (catched) {
        const err = new ErrorWithCatch(`plugin construct failed`, catched)
        ctx.logger.error(err.message, err.catched)
        throw err
      }
      if (typeof plugin.bootstrap === 'function') pluginBootstraps.push(async (): Promise<void> => {
        try {
          await (plugin.bootstrap as () => Promise<void>)()
        } catch (catched) {
          const err = new ErrorWithCatch(`plugin bootstrap failed`, catched)
          pluginCtx.logger.error(err.message, err.catched)
          throw err
        }
      })
    }
    return pluginBootstraps
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

export const ModuleRef = refDecorator('module', ModuleMeta)
