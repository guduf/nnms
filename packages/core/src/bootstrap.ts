import Container, { ContainerInstance } from 'typedi'
import Transport from 'winston-transport'

import { ApplicationContext } from './application_ref'
import { ErrorWithCatch } from './errors'
import { ModuleMeta, ModuleContext, PluginMeta } from './module_ref'
import { ProviderMeta } from './provider'
import Logger from './logger';
import { PREFIX } from './common';

export function bootstrapPlugins(container: ContainerInstance, plugins: PluginMeta[]) {
  plugins.map(pluginMeta => container.get(pluginMeta.type))
}

export async function bootstrapModule(logger: Logger, meta: ModuleMeta): Promise<void> {
  logger.debug(`bootstrap module '${meta.name}'`)
  const container = Container.of(meta)
  container.set({type: ModuleContext, value: meta.buildContext(container)})
  try {
    const mod = container.get(meta.type) as { init?: Promise<void> }
    if (!(mod instanceof meta.type)) throw new Error('invalid module instance')
    if (mod.init instanceof Promise) await mod.init
    logger.info(`module '${meta.name}' is ready`)
  } catch (catched) {
    const err = new ErrorWithCatch(`module '${meta.name}'init failed`, catched)
    logger.error(err.message, err.catched)
    throw err
  }
  await Promise.all(meta.plugins.map(async (pluginMeta) => {
    try {
      const plugin = container.get(pluginMeta.type) as { init?: Promise<void> }
      if (!(plugin instanceof pluginMeta.type)) throw new Error('invalid plugin instance')
      if (plugin.init instanceof Promise) await plugin.init
      logger.info(`plugin '${pluginMeta.name}' of module '${meta.name}' is ready`)
    } catch (catched) {
      const err = new ErrorWithCatch(`plugin init failed`, catched)
      logger.error(err.message, err.catched)
      throw err
    }
  }))
}

export async function bootstrapProvider(logger: Logger, meta: ProviderMeta): Promise<void> {
  logger.debug(`bootstrap provider '${meta.name}'`)
  let provider: { init?: Promise<void> }
  try {
    provider = Container.get(meta.type)
    if (provider.init instanceof Promise) await provider.init
    logger.info(`provider '${meta.name}' is ready`)
  } catch (catched) {
    const err = new ErrorWithCatch(`provider init failed`, catched)
    logger.error(err.message, err.catched)
    throw err
  }
}

export async function bootstrap(
  opts: { name: string, loggerTransports?: Transport[] },
  ...mods: Function[]
): Promise<void> {
  try {
    const appRef = new ApplicationContext(opts.name, opts.loggerTransports)
    appRef.logger.info(`bootstrap application`)
    if (Container.has(ApplicationContext as any)) {
      throw new Error('global container has another ApplicationRef')
    }
    Container.set({type: ApplicationContext, global: true, value: appRef})
    const metas = mods.reduce((acc, modType) => {
      const modMeta = Reflect.getMetadata(`${PREFIX}:module`, modType)
      if (!(modMeta instanceof ModuleMeta)) throw new Error('invalid module')
      return {
        mods: acc.mods.includes(modMeta) ? acc.mods : [...acc.mods, modMeta],
        providers: [...modMeta.plugins, ...modMeta.providers]
          .reduce((subAcc, subMeta) => (
            [...subAcc, ...subMeta.providers]
          ), modMeta.providers)
          .reduce((provAcc, provMeta) => (
            provAcc.includes(provMeta) ? provAcc : [...provAcc, provMeta]
          ), acc.providers)
      }
    }, { mods: [] as ModuleMeta[], providers: [] as ProviderMeta[] })
    await Promise.all(metas.providers.map(prov => bootstrapProvider(appRef.logger, prov)))
    await Promise.all(metas.mods.map(mod => bootstrapModule(appRef.logger, mod)))
    appRef.logger.info('application is ready', {
      providers: metas.providers.map(({name}) => name),
      modules: metas.mods.reduce((acc, {name, plugins}) => ({
        ...acc,
        [name]: plugins.map(plugin => plugin.name)
      }), {})
    })
  } catch (err) {
    setImmediate(() => {
      console.error(err)
      process.exit(1)
    })
  }
}

export default bootstrap
