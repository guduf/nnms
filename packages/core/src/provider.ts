import { getContainerContext, ResourceMeta, ResourceContext } from './common'
import Container from 'typedi';
import { JsonObject } from 'type-fest';

export interface ProviderMetric extends JsonObject {
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
      providers: {$insert: [{name: this.name, status: 'bootstrap'} as ProviderMetric]}
    })
    let provider: { init?: Promise<void> }
    try {
      provider = Container.get(this.type)
      if (provider.init instanceof Promise) await provider.init
      logger.info('PROVIDER_READY', {prov: this.name}, {
        providers: {
          $metricKey: 'name',
          $patch: [{name: this.name, status: 'ready'} as ProviderMetric]
        }
      })
    } catch (catched) {
      logger.error('PROVIDER_BOOTSTRAP_FAILED', catched)
      throw catched
    }
  }

  buildContext(): ProviderContext {
    const {env, logger} = getContainerContext()
    return {
      name: this.name,
      kind: 'provider',
      meta: this,
      logger: logger.extend({src: 'prov', prov: this.name}),
      vars: env.extract(this.vars, this.name.toUpperCase())
    }
  }
}

