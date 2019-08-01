import { getApplicationRef } from './module_ref'
import { CommonMeta, CommonContext, PREFIX, CommonOpts } from './common'
import { refDecorator } from './di'
import { Logger } from './logger'

export class ProviderContext<TVars extends Record<string, string> = {}> implements CommonContext<TVars> {
  readonly id: string
  readonly mode: 'dev' | 'prod' | 'test'
  readonly logger: Logger
  readonly vars: { readonly [P in keyof TVars]: string }

  constructor(meta: ProviderMeta<TVars>) {
    const {env, logger} = getApplicationRef()
    this.id = `${PREFIX}:module:${meta.name}`
    this.mode = env.isProduction ? 'prod' : 'dev'
    this.logger = logger.extend(meta.name)
    this.vars = env.extract(meta.vars, meta.name.toUpperCase())
  }
}

export type ProviderOpts<TVars extends Record<string, string> = {}> = CommonOpts<TVars>

export class ProviderMeta<TVars extends Record<string, string> = {}> extends CommonMeta<TVars> {
  constructor(type: Function, opts: ProviderOpts<TVars>) {
    super(type, opts)
  }
}

export const ProviderRef = refDecorator('provider', ProviderMeta)
