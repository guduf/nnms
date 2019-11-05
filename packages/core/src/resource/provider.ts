import Container from 'typedi'

import { LogMetricValue } from '../log'
import { injectContext } from '../di'
import { ResourceMeta, ResourceContext } from './resource'
import { defineResourceMeta } from './resource_di'

export interface ProviderMetric extends LogMetricValue {
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
    const {logger} = injectContext()
    logger.metrics(`bootstrap provider '${this.name}'`, {
      providers: {insert: [{name: this.name, status: 'bootstrap'} as ProviderMetric]}
    })
    let provider: { init?: Promise<void> }
    try {
      provider = Container.get(this.target)
      if (provider.init instanceof Promise) await provider.init
      logger.info('PROVIDER_READY', {prov: this.name}, {
        providers: {
          index: 'name',
          patch: [{name: this.name, status: 'ready'} as ProviderMetric]
        }
      })
    } catch (catched) {
      logger.error('PROVIDER_BOOTSTRAP_FAILED', catched)
      throw catched
    }
  }

  buildContext(): ProviderContext {
    const {crash, env, logger} = injectContext()
    const provTags = {src: 'prov', prov: this.name}
    return {
      name: this.name,
      kind: 'provider',
      meta: this,
      crash: (err, tags) => crash(err, {...provTags, ...tags}),
      logger: logger.extend(provTags),
      vars: env.extract(this.vars, this.name.toUpperCase())
    }
  }
}

export const Provider = (name: string, vars: Record<string, string>, ...providers: Function[]) => (
  defineResourceMeta('provider', ProviderMeta)({name, vars, providers})
)

