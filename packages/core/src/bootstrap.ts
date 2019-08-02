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

export async function bootstrapModule(logger: Logger, type: Function): Promise<void> {
  const meta = getClassMeta('module', type)
  if (!(meta instanceof ModuleMeta)) throw new Error('Invalid module')
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

export function bootstrapProviders(logger: Logger, providers: Function[]): () => Promise<void> {
  const hooks = [] as (() => void)[]
  for (const type of providers) {
    const meta = getClassMeta('provider', type)
    if (!(meta instanceof ProviderMeta)) throw new Error('Invalid provider')
    logger.debug(`bootstrap provider '${meta.name}'`)
    const providerCtx = new ProviderContext(meta)
    const providerContainer = Container.of(providerCtx.id)
    providerContainer.set(ProviderContext, providerCtx)
    let provider: { onInit?: () => void }
    try {
      provider = providerContainer.get(meta.type)
    } catch (catched) {
      const err = new ErrorWithCatch(`provider construct failed`, catched)
      providerCtx.logger.error(err.message, err.catched)
      throw err
    }
    if (typeof provider.onInit === 'function') hooks.push(() => (
      () => (provider as { onInit: () => void }).onInit()
    ))
  }
  return () => Promise.all(hooks.map(hook => hook())).then(() => { })
}
export async function bootstrap(
  opts: { name: string, providers?: Function[], loggerTransports?: Transport[] },
  ...mods: Function[]
): Promise<void> {
  try {
    const appRef = new ApplicationContext(opts.name, opts.loggerTransports)
    appRef.logger.debug(`bootstrap application '${appRef.name}'`)
    if (Container.has(ApplicationContext as any)) {
      throw new Error('Container has another ApplicationRef setted')
    }
    Container.set({type: ApplicationContext, global: true, value: appRef})
    const hook = opts.providers ? bootstrapProviders(appRef.logger, opts.providers) : async () => { }
    await Promise.all(mods.map(mod => bootstrapModule(appRef.logger, mod)))
    await hook()
  } catch (err) {
    setImmediate(() => {
      console.error(err)
      process.exit(1)
    })
  }
}

export default bootstrap
