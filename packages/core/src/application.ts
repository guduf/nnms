import Container from 'typedi'

import { ApplicationContext, getResourceMeta, RESOURCE_CONTEXT_TOKEN, ResourceMeta } from './resource'
import { Crash } from './error'
import { Event } from './event'
import Environment from './environment'
import { Logger } from './log'
import { ModuleMeta, ProviderMeta } from './resource'
import { Observable, Subject } from 'rxjs'

/** Browses resource metas recursively to extract all providers that must be bootstraped. */
export function extractProviderInjections(...metas: ResourceMeta[]): ProviderMeta[] {
  const raw = metas.reduce((acc, meta) => {
    if (!(meta instanceof ResourceMeta)) throw new Error('invalid meta')
    const metaProviders = meta.providers.reduce((acc, provMeta) => (
      [...acc, provMeta as ProviderMeta, ...extractProviderInjections(provMeta)]
    ), [] as ProviderMeta[])
    const pluginProviders = (
      meta instanceof ModuleMeta ?
        meta.plugins.reduce((acc, pluginMeta) => (
          [...acc, ...extractProviderInjections(pluginMeta)]
        ), [] as ProviderMeta[]) :
        []
    )
    return [...acc, ...metaProviders, ...pluginProviders]
  }, [] as ProviderMeta[])
  return Array.from(new Set(raw))
}

/* Instantiates and bootstraps providers while respecting inter dependencies. */
export async function bootstrapProviders(...metas: ProviderMeta[]): Promise<void> {
  const remaining = [...metas]
  const bootstraped = [] as ProviderMeta[]
  while (remaining.length) {
    const boostrapable = remaining.find(meta => !(meta.providers || []).find(meta => !bootstraped.includes(meta))) || null
    if (!boostrapable) throw new Error('failed to bootstrap prov')
    bootstraped.push(boostrapable)
    const i = remaining.indexOf(boostrapable)
    remaining.splice(i, 1)
    await boostrapable.bootstrap()
  }
}

/* Creates a application and bootstraps all resources. */
export function bootstrap(...mods: Function[]): { outputs: Observable<Event>, nextInput: (e: Event) => void } {
  const env = new Environment()
  const tags = {src: 'app', app: 'my-app'}
  const inputs = new Subject<Event>()
  const outputs = new Subject<Event>()
  const logger = new Logger(tags, log => outputs.next(log.toEvent()))
  const ctx: ApplicationContext =  {
    kind: 'application',
    name: 'my-app',
    env,
    logger,
    crash: err => outputs.next(Crash.create(err, tags).toEvent()),
    inputs: inputs.asObservable(),
    nextOutput: e => outputs.next(e)
  }
  setTimeout(async () => {
    try {
      ctx.logger.info('APPLICATION_BOOTSTRAP')
      if (Container.has(ApplicationContext as any)) {
        throw new Error('global container has another ApplicationContext')
      }
      Container.set(RESOURCE_CONTEXT_TOKEN, ctx)
      const modMetas = mods.reduce((acc, modType) => {
        const modMeta = getResourceMeta('module', modType)
        if (!(modMeta instanceof ModuleMeta)) throw new Error('invalid module')
        return acc.includes(modMeta) ? acc : [...acc, modMeta]
      }, [] as ModuleMeta[])
      const provMetas = extractProviderInjections(...modMetas)
      await bootstrapProviders(...provMetas)
      await Promise.all(modMetas.map(mod => mod.bootstrap()))
      ctx.logger.info('APPLICATION_READY', {
        providers: provMetas.map(({name}) => name),
        modules: modMetas.reduce((acc, {name, plugins}) => (
          {...acc, [name]: plugins.map(plugin => plugin.name)}
        ), {})
      })
    } catch (err) {
      outputs.next(Crash.create(err, tags).toEvent())
    }
  })
  return {outputs: outputs.asObservable(), nextInput: e => inputs.next(e)}
}
