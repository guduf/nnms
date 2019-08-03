import Container, { ContainerInstance } from 'typedi'
import Transport from 'winston-transport'

import { ApplicationContext } from './application_ref'
import { ErrorWithCatch } from './errors'
import { ModuleMeta, ModuleContext } from './module_ref'
import { PluginMeta } from './plugin_ref'
import { ProviderMeta } from './provider'
import Logger from './logger';
import { PREFIX } from './common';

export function bootstrapPlugins(container: ContainerInstance, plugins: PluginMeta[]) {
  plugins.map(pluginMeta => container.get(pluginMeta.type))
}

export async function bootstrapModule(logger: Logger, meta: ModuleMeta): Promise<void> {
  logger.debug(`bootstrap module '${meta.name}'`)
  const moduleContainer = Container.of(meta)
  let mod: { init?: () => Promise<void> }
  moduleContainer.set({type: ModuleContext, value: meta.buildContext(moduleContainer)})
  try {
    mod = moduleContainer.get(meta.type)
    if (typeof mod.init === 'function') await mod.init()
  } catch (catched) {
    const err = new ErrorWithCatch(`module init failed`, catched)
    logger.error(err.message, err.catched)
    throw err
  }
  if (!(mod instanceof meta.type)) throw new Error('Invalid module instance')
  moduleContainer.set({type: ModuleMeta, value: meta})
  meta.plugins.map(pluginMeta => moduleContainer.get(pluginMeta.type))
}

export function bootstrapProviders(logger: Logger, providers: ProviderMeta[]): () => Promise<void> {
  const hooks = [] as (() => void)[]
  const metas = [] as ProviderMeta[]
  for (const meta of providers) {
    if (!(meta instanceof ProviderMeta)) throw new Error('Invalid provider')
    logger.debug(`bootstrap provider '${meta.name}'`)
    metas.push(meta)
    let provider: { onInit?: () => void }
    try {
      provider = Container.get(meta.type)
    } catch (catched) {
      const err = new ErrorWithCatch(`provider construct failed`, catched)
      logger.error(err.message, err.catched)
      throw err
    }
    if (typeof provider.onInit === 'function') hooks.push(() => (
      () => (provider as { onInit: () => void }).onInit()
    ))
  }
  return () => Promise.all(hooks.map(hook => hook())).then(() => { })
}

export async function bootstrap(
  opts: { name: string, loggerTransports?: Transport[] },
  ...mods: Function[]
): Promise<void> {
  try {
    const appRef = new ApplicationContext(opts.name, opts.loggerTransports)
    appRef.logger.info(`application started`)
    if (Container.has(ApplicationContext as any)) {
      throw new Error('Container has another ApplicationRef setted')
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
    const hook = bootstrapProviders(appRef.logger, metas.providers)
    await Promise.all(metas.mods.map(mod => bootstrapModule(appRef.logger, mod)))
    await hook()
    appRef.logger.info('application ready', {
      providers: metas.providers.map(({name}) => name),
      modules: metas.mods.map(({name}) => name)
    })
  } catch (err) {
    setImmediate(() => {
      console.error(err)
      process.exit(1)
    })
  }
}

export default bootstrap
