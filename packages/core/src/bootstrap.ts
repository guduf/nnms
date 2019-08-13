import Container, { ContainerInstance } from 'typedi'
import Transport from 'winston-transport'

import { ApplicationContext } from './application'
import { ErrorWithCatch } from './errors'
import { ModuleMeta, PluginMeta } from './module_ref'
import { ProviderMeta } from './provider'
import { PREFIX } from './common'

export function bootstrapPlugins(container: ContainerInstance, plugins: PluginMeta[]) {
  plugins.map(pluginMeta => container.get(pluginMeta.type))
}

export async function bootstrapModule(appCtx: ApplicationContext, meta: ModuleMeta): Promise<void> {
  appCtx.registerModule(meta)
  appCtx.logger.debug(`bootstrap module '${meta.name}'`)
  const container = Container.of(meta)
  try {
    const mod = container.get(meta.type) as { init?: Promise<void> }
    if (!(mod instanceof meta.type)) throw new Error('invalid module instance')
    if (mod.init instanceof Promise) await mod.init
    appCtx.initModule(meta)
    appCtx.logger.info(`module '${meta.name}' is ready`)
  } catch (catched) {
    const err = new ErrorWithCatch(`module '${meta.name}'init failed`, catched)
    appCtx.logger.error(err.message, err.catched)
    throw err
  }
  await Promise.all(meta.plugins.map(async (pluginMeta) => {
    try {
      appCtx.registerPlugin(meta, pluginMeta)
      const plugin = container.get(pluginMeta.type) as { init?: Promise<void> }
      if (!(plugin instanceof pluginMeta.type)) throw new Error('invalid plugin instance')
      if (plugin.init instanceof Promise) await plugin.init
      appCtx.initPlugin(meta, pluginMeta)
      appCtx.logger.info(`plugin '${pluginMeta.name}' of module '${meta.name}' is ready`)
    } catch (catched) {
      const err = new ErrorWithCatch(`plugin init failed`, catched)
      appCtx.logger.error(err.message, err.catched)
      throw err
    }
  }))
}

export async function bootstrapProvider(ctx: ApplicationContext, meta: ProviderMeta): Promise<void> {
  ctx.registerProvider(meta)
  ctx.logger.debug(`bootstrap provider '${meta.name}'`)
  let provider: { init?: Promise<void> }
  try {
    provider = Container.get(meta.type)
    if (provider.init instanceof Promise) await provider.init
    ctx.initProvider(meta)
    ctx.logger.info(`provider '${meta.name}' is ready`)
  } catch (catched) {
    const err = new ErrorWithCatch(`provider init failed`, catched)
    ctx.logger.error(err.message, err.catched)
    throw err
  }
}

export async function bootstrap(
  opts: { name: string, loggerTransports?: Transport[] },
  ...mods: Function[]
): Promise<void> {
  try {
    const appCtx = new ApplicationContext(opts.name, opts.loggerTransports)
    appCtx.logger.info(`bootstrap application`)
    if (Container.has(ApplicationContext as any)) {
      throw new Error('global container has another ApplicationContext')
    }
    Container.set({type: ApplicationContext, global: true, value: appCtx})
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
    await Promise.all(metas.providers.map(prov => bootstrapProvider(appCtx, prov)))
    await Promise.all(metas.mods.map(mod => bootstrapModule(appCtx, mod)))
    appCtx.logger.info('application is ready', {
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
