import { Container } from 'typedi'

import { ApplicationContext } from './application_ref'
import { PREFIX } from './common'
import { getClassMeta } from './di'
import Environment from './environment'
import Logger from './logger'
import { PluginMeta } from './plugin_ref'
import { ProviderMeta, ProviderOpts, refDecorator, ProviderContext } from './provider';

export class ModuleContext<TVars extends Record<string, string> = {}> implements ProviderContext<TVars> {
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

export interface ModuleOpts<TVars extends Record<string, string> = {}>  extends ProviderOpts<TVars> {
  plugins?: Function[]
}

export class ModuleMeta<TVars extends Record<string, string> = {}> extends ProviderMeta<TVars> {
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

export function getApplicationRef(): ApplicationContext {
  if (!Container.has(ApplicationContext as any)) throw new Error('Container has no ApplicationRef')
  const appRef = Container.get(ApplicationContext as any) as any
  if (!(appRef instanceof ApplicationContext)) throw new Error('ApplicationRef is not valid instance')
  return appRef
}

export const ModuleRef = refDecorator('module', ModuleMeta)
