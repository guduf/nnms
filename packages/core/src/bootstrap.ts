import Container from 'typedi'
import Transport from 'winston-transport'

import { ApplicationContext } from './application_ref'
import { getClassMeta } from './di'
import { ErrorWithCatch } from './errors'
import { ModuleMeta, ModuleContext } from './module_ref'
import { PluginMeta, PluginContext } from './plugin_ref'
import { ProviderMeta, ProviderContext } from './provider'
import Logger from './logger';

export function bootstrapPlugins(logger: Logger, moduleId: string, plugins: PluginMeta[]) {
  for (const meta of plugins) {
    logger.debug(`bootstrap plugin '${meta.name}' for module '${moduleId.split(':')[2]}'`)
    const ctx = new PluginContext(moduleId, meta)
    const container = Container.of(ctx.id)
    container.set(PluginContext, ctx)
    try {
      container.get(meta.type)
    } catch (catched) {
      const err = new ErrorWithCatch(`plugin construct failed`, catched)
      ctx.logger.error(err.message, err.catched)
      throw err
    }
  }
}

export async function bootstrapModule(logger: Logger, meta: ModuleMeta): Promise<void> {
  logger.debug(`bootstrap module '${meta.name}'`)
  const ctx = new ModuleContext(meta)
  const moduleContainer = Container.of(ctx.id)
  moduleContainer.set(ModuleContext, ctx)
  let mod: { init?: () => Promise<void> }
  try {
    mod = moduleContainer.get(meta.type)
    if (typeof mod.init === 'function') await mod.init()
  } catch (catched) {
    const err = new ErrorWithCatch(`module init failed`, catched)
    ctx.logger.error(err.message, err.catched)
    throw err
  }
  if (!(mod instanceof meta.type)) throw new Error('Invalid module instance')
  bootstrapPlugins(logger, ctx.id, meta.plugins)
}

export function bootstrapProviders(logger: Logger, providers: ProviderMeta[]): () => Promise<void> {
  const hooks = [] as (() => void)[]
  const metas = [] as ProviderMeta[]
  for (const meta of providers) {
    if (!(meta instanceof ProviderMeta)) throw new Error('Invalid provider')
    logger.debug(`bootstrap provider '${meta.name}'`)
    metas.push(meta)
    const ctx = new ProviderContext(meta)
    const container = Container.of(ctx.id)
    container.set(ProviderContext, ctx)
    let provider: { onInit?: () => void }
    try {
      provider = container.get(meta.type)
    } catch (catched) {
      const err = new ErrorWithCatch(`provider construct failed`, catched)
      ctx.logger.error(err.message, err.catched)
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
    const metas = mods.reduce((acc, mod) => {
      const modMeta = getClassMeta<ModuleMeta>('module', mod)
      return {
        mods: acc.mods.includes(modMeta) ? acc.mods : [...acc.mods, modMeta],
        providers: modMeta.plugins
          .reduce((pluginAcc, pluginMeta) => (
            [...pluginAcc, ...pluginMeta.providers]
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
