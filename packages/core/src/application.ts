import Container from 'typedi'

import { PREFIX, ApplicationContext, RESOURCE_CONTEXT_TOKEN, ResourceMeta } from './common'
import Environment from './environment'
import Logger, { scanMetric, LoggerTags, filterByTags } from './logger'
import { ModuleMeta, ModuleMetric } from './module_ref'
import { ProviderMeta, ProviderMetric } from './provider'
import { PluginMetric } from './plugin'
import { share } from 'rxjs/operators'

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

export function bootstrap(name: string, ...mods: Function[]): ApplicationContext {
  const env = new Environment()
  const tags: LoggerTags = {src: 'app', app: name}
  const logger = Logger.create(tags)
  const appEvents = logger.events.pipe(filterByTags(tags), share())
  const ctx: ApplicationContext =  {
    kind: 'application',
    name,
    env,
    logger,
    modules: appEvents.pipe(scanMetric<ModuleMetric>('modules')),
    providers: appEvents.pipe(scanMetric<ProviderMetric>('providers')),
    plugins: appEvents.pipe(scanMetric<PluginMetric>('plugins'))
  }
  const _bootstrap = async () => {
    ctx.logger.info('APPLICATION_BOOTSTRAP')
    if (Container.has(ApplicationContext as any)) {
      throw new Error('global container has another ApplicationContext')
    }
    Container.set(RESOURCE_CONTEXT_TOKEN, ctx)
    const modMetas = mods.reduce((acc, modType) => {
      const modMeta = Reflect.getMetadata(`${PREFIX}:module`, modType)
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
  }
  _bootstrap()
  return ctx
}
