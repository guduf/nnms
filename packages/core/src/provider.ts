import { getContainerContext, ResourceMeta, ResourceContext } from './common'
import { ErrorWithCatch } from './errors';
import Container from 'typedi';

export interface ProviderMetric {
  name: string,
  status: 'bootstrap' | 'ready'
}

export abstract class ProviderContext<TVars extends Record<string, string> = {}>  extends ResourceContext<TVars>{
  readonly kind: 'provider'
}

export class ProviderMeta<TVars extends Record<string, string> = {}> extends ResourceMeta<TVars> {
  readonly name: string
  readonly vars: TVars
  readonly providers: ProviderMeta[]

  async bootstrap(): Promise<void> {
    const {logger} = getContainerContext()
    logger.metric(`bootstrap provider '${this.name}'`, {
      providers: {$add: [{name: this.name, status: 'bootstrap'} as ProviderMetric]}
    })
    let provider: { init?: Promise<void> }
    try {
      provider = Container.get(this.type)
      if (provider.init instanceof Promise) await provider.init
      logger.info('PROVIDER_READY', {prov: this.name}, {
        providers: {
          metricKey: 'name',
          $patch: [{name: this.name, status: 'ready'} as ProviderMetric]
        }
      })
    } catch (catched) {
      const err = new ErrorWithCatch(`provider init failed`, catched)
      logger.error('PROVIDER_BOOTSTRAP_FAILED', err.message, err.catched)
      throw err
    }
  }

  buildContext(): ProviderContext {
    const {env, logger} = getContainerContext()
    return {
      name: this.name,
      kind: 'provider',
      meta: this,
      mode: env.isProduction ? 'prod' : 'dev',
      logger: logger.extend({resource: 'prov', prov: this.name}),
      vars: env.extract(this.vars, this.name.toUpperCase())
    }
  }
}

