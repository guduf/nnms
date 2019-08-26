import Container from 'typedi'

import { PREFIX, ApplicationContext, RESOURCE_CONTEXT_TOKEN } from './common'
import Environment from './environment'
import Logger, { scanMetrics, LoggerTags } from './logger'
import { ModuleMeta, ModuleMetric } from './module_ref'
import { ProviderMeta, ProviderMetric } from './provider'
import { PluginMetric } from './plugin';

export function bootstrap(name: string, ...mods: Function[]): ApplicationContext {
  const env = new Environment()
  const tags: LoggerTags = {resource: 'app', app: name}
  const logger = Logger.create(tags)
  const ctx: ApplicationContext =  {
    kind: 'application',
    name,
    env,
    logger,
    modules: logger.events.pipe(scanMetrics<ModuleMetric>(tags, 'modules')),
    providers: logger.events.pipe(scanMetrics<ProviderMetric>(tags, 'providers')),
    plugins: logger.events.pipe(scanMetrics<PluginMetric>(tags, 'plugins'))
  }
  const _bootstrap = async () => {
    ctx.logger.info('APPLICATION_BOOTSTRAP')
    if (Container.has(ApplicationContext as any)) {
      throw new Error('global container has another ApplicationContext')
    }
    Container.set(RESOURCE_CONTEXT_TOKEN, ctx)
    const metas = mods.reduce((acc, modType) => {
      const modMeta = Reflect.getMetadata(`${PREFIX}:module`, modType)
      if (!(modMeta instanceof ModuleMeta)) throw new Error('invalid module')
      return {
        mods: acc.mods.includes(modMeta) ? acc.mods : [...acc.mods, modMeta],
        providers: [...modMeta.plugins, ...modMeta.providers]
          .reduce((subAcc, subMeta) => ([...subAcc, ...subMeta.providers]), modMeta.providers)
          .reduce((provAcc, provMeta) => (
            provAcc.includes(provMeta as ProviderMeta) ?
              provAcc :
              [...provAcc, provMeta as ProviderMeta]
          ), acc.providers)
      }
    }, { mods: [] as ModuleMeta[], providers: [] as ProviderMeta[] })
    await Promise.all(metas.providers.map(prov => prov.bootstrap()))
    await Promise.all(metas.mods.map(mod => mod.bootstrap()))
    ctx.logger.info('APPLICATION_READY', {
      providers: metas.providers.map(({name}) => name),
      modules: metas.mods.reduce((acc, {name, plugins}) => (
        {...acc, [name]: plugins.map(plugin => plugin.name)}
      ), {})
    })
  }
  _bootstrap()
  return ctx
}
