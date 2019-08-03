import { Container } from 'typedi'

import { ApplicationContext } from './application_ref'
import { CommonMeta, CommonOpts, CommonContext, PREFIX } from './common'
import { getClassMeta, refDecorator } from './di'
import Environment from './environment'
import Logger from './logger'
import { PluginMeta } from './plugin_ref'
import { ProviderMeta } from './provider';

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
  providers?: Function[]
}

export class ModuleMeta<TVars extends Record<string, string> = {}> extends CommonMeta<TVars> {
  readonly plugins: PluginMeta[]
  readonly providers: ProviderMeta[]

  constructor(type: Function, opts: ModuleOpts<TVars>) {
    super(type, opts)
    this.plugins = (opts.plugins || []).map(type => getClassMeta('plugin', type))
    this.providers = (opts.providers || []).map(type => getClassMeta('provider', type))
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

export function getApplicationRef(): ApplicationContext {
  if (!Container.has(ApplicationContext as any)) throw new Error('Container has no ApplicationRef')
  const appRef = Container.get(ApplicationContext as any) as any
  if (!(appRef instanceof ApplicationContext)) throw new Error('ApplicationRef is not valid instance')
  return appRef
}

export const ModuleRef = refDecorator('module', ModuleMeta)
