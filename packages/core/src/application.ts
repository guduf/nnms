import Container from 'typedi'

import { PREFIX, ApplicationContext, RESOURCE_CONTEXT_TOKEN, ResourceMeta } from './common'
import Environment from './environment'
import Logger, { scanMetrics, LoggerTags, filterByTags } from './logger'
import { ModuleMeta, ModuleMetric } from './module_ref'
import { ProviderMeta, ProviderMetric } from './provider'
import { PluginMetric } from './plugin';
import { share } from 'rxjs/operators';


export function extractProviderInjections(...metas: ResourceMeta[]): ProviderMeta[] {
  const raw = metas.reduce((acc, meta) => {
    if (!(meta instanceof ResourceMeta)) throw new Error('invalid meta')
    const metaProviders = meta.providers.reduce((acc, provider) => [...acc, ...extractProviderInjections(provider)], [] as ProviderMeta[])
    const paramTypes = Reflect.getMetadata('design:paramtypes', meta.type) as any[] || []
    return paramTypes.reduce((acc, paramType) => {
      const paramMeta = Reflect.getMetadata(`${PREFIX}:provider`, paramType)
      if (!(paramMeta instanceof ProviderMeta)) return acc
      return [...acc, ...extractProviderInjections(paramMeta)]
    }, [acc, ...metaProviders])
  }, [] as ProviderMeta[])
  return Array.from(new Set(raw))
}

export async function bootstrapProviders(...metas: ProviderMeta[]): Promise<void> {
  let remaining = [...metas]
  let bootstraped = [] as ProviderMeta[]
  while (remaining.length) {
    const boostrapable = remaining.find(meta => !(meta.providers || []).find(meta => !bootstraped.includes(meta))) || null
    if (!boostrapable) throw new Error('failed to bootstrap prov')
    bootstraped = [...bootstraped, boostrapable]
    const i = remaining.indexOf(boostrapable)
    remaining = [...remaining.slice(0, i), ...remaining.slice(i)]
  }
}

export function bootstrap(name: string, ...mods: Function[]): ApplicationContext {
  const env = new Environment()
  const tags: LoggerTags = {resource: 'app', app: name}
  const logger = Logger.create(tags)
  const appEvents = logger.events.pipe(filterByTags(tags), share())
  const ctx: ApplicationContext =  {
    kind: 'application',
    name,
    env,
    logger,
    modules: appEvents.pipe(scanMetrics<ModuleMetric>('modules')),
    providers: appEvents.pipe(scanMetrics<ProviderMetric>('providers')),
    plugins: appEvents.pipe(scanMetrics<PluginMetric>('plugins'))
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
