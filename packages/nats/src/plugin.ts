import { PluginRef, PluginContext, pluginDecorator } from 'nnms'

import { NatsProvider } from './provider'

export interface NatsSubscriberOpts {
  subjectSuffix: string
}

export class NatsSubscriberMeta {
  subjectSuffix: string
  constructor(opts: Partial<NatsSubscriberOpts>) {
    if (!opts.subjectSuffix) throw new Error('Missing subject suffix')
    this.subjectSuffix = opts.subjectSuffix
  }
}

export function NatsSubscriber(
  subjectSuffix: string
) {
  const meta = new NatsSubscriberMeta({subjectSuffix})
  return pluginDecorator('nats', meta)
}

@PluginRef({name: 'nats'})
export class NatsPlugin {
  constructor(
    ctx: PluginContext,
    nats: NatsProvider
  ) {
    for (const {meta, func} of ctx.methods) {
      if (!(meta instanceof NatsSubscriberMeta)) throw new Error('Invalid meta')
      nats.watch(`${ctx.moduleId.split(':')[2]}.${meta.subjectSuffix}`).subscribe(e => func(e))
    }
  }
}