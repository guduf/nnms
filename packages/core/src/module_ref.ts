import { Container } from 'typedi'

import { getApplicationRef } from './application_ref'
import { CommonMeta, CommonOpts, CommonContext, PREFIX } from './common'
import { getClassMeta, refDecorator } from './di'
import Environment from './environment'
import { ErrorWithCatch } from './errors'
import Logger from './logger'
import { PluginMeta, startPlugins } from './plugin_ref'

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

  getVars(env: Environment): TVars {
    const prefix = this.name.toUpperCase()
    const pluginsVarsTpl = this.plugins.reduce((acc, {vars}) => ({
      ...acc,
      ...vars
    }), {} as { [envVar: string]: string })
    return env.extract({...pluginsVarsTpl, ...this.vars}, prefix)
  }
}

export async function startModule(type: Function): Promise<void> {
  const meta = Reflect.getMetadata(`${PREFIX}:module`, type)
  if (!(meta instanceof ModuleMeta)) throw new Error('Invalid module')
  const ctx = new ModuleContext(meta)
  const moduleContainer = Container.of(ctx.id)
  moduleContainer.set(ModuleContext, ctx)
  let mod: { init?: () => Promise<void> }
  try {
    mod = moduleContainer.get(meta.type)
    if (typeof mod.init === 'function') await mod.init()
  } catch (catched) {
    const err = new ErrorWithCatch(`module init failed`, catched)
    ctx.logger.error(err.message, err.catched)
    throw err
  }
  if (!(mod instanceof meta.type)) throw new Error('Invalid module instance')
  startPlugins(ctx.id, meta.plugins)
}

export const ModuleRef = refDecorator('module', ModuleMeta)
