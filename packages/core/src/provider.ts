import { getApplicationRef } from './application_ref'
import { CommonMeta, CommonContext, PREFIX, CommonOpts } from './common'
import { refDecorator } from './di'
import { Logger } from './logger'
import Container from 'typedi';
import { ErrorWithCatch } from './errors';

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

export function startProviders(providers: Function[]): () => Promise<void> {
  const hooks = [] as (() => void)[]
  for (const type of providers) {
    const meta = Reflect.getMetadata(`${PREFIX}:provider`, type)
    if (!(meta instanceof ProviderMeta)) throw new Error('Invalid provider')
    const providerCtx = new ProviderContext(meta)
    const providerContainer = Container.of(providerCtx.id)
    providerContainer.set(ProviderContext, providerCtx)
    let provider: { onInit?: () => void }
    try {
      provider = providerContainer.get(meta.type)
    } catch (catched) {
      const err = new ErrorWithCatch(`provider construct failed`, catched)
      providerCtx.logger.error(err.message, err.catched)
      throw err
    }
    if (typeof provider.onInit === 'function') hooks.push(() => (
      () => (provider as { onInit: () => void }).onInit()
    ))
  }
  return () => Promise.all(hooks.map(hook => hook())).then(() => { })
}

export const ProviderRef = refDecorator('provider', ProviderMeta)
