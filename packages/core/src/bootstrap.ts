import Container from 'typedi'
import Transport from 'winston-transport'

import { ApplicationContext } from './application_ref'
import { getClassMeta } from './di'
import { ErrorWithCatch } from './errors'
import { ModuleMeta, ModuleContext } from './module_ref'
import { PluginMeta, PluginContext } from './plugin_ref'
import { ProviderMeta, ProviderContext } from './provider'

export function bootstrapPlugins(moduleId: string, plugins: PluginMeta[]) {
  for (const pluginMeta of plugins) {
    const pluginCtx = new PluginContext(moduleId, pluginMeta)
    const pluginContainer = Container.of(pluginCtx.id)
    pluginContainer.set(PluginContext, pluginCtx)
    try {
      pluginContainer.get(pluginMeta.type)
    } catch (catched) {
      const err = new ErrorWithCatch(`plugin construct failed`, catched)
      pluginCtx.logger.error(err.message, err.catched)
      throw err
    }
  }
}

export async function bootstrapModule(type: Function): Promise<void> {
  const meta = getClassMeta('module', type)
  if (!(meta instanceof ModuleMeta)) throw new Error('Invalid module')
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
  bootstrapPlugins(ctx.id, meta.plugins)
}

export function bootstrapProviders(providers: Function[]): () => Promise<void> {
  const hooks = [] as (() => void)[]
  for (const type of providers) {
    const meta = getClassMeta('provider', type)
    if (!(meta instanceof ProviderMeta)) throw new Error('Invalid provider')
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
    if (Container.has(ApplicationContext as any)) {
      throw new Error('Container has another ApplicationRef setted')
    }
    Container.set({type: ApplicationContext, global: true, value: appRef})
    const hook = opts.providers ? bootstrapProviders(opts.providers) : async () => { }
    await Promise.all(mods.map(mod => bootstrapModule(mod)))
    await hook()
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

export default bootstrap
