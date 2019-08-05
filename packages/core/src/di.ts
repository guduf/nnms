import 'reflect-metadata'
import { Container, ContainerInstance } from 'typedi'
import { PREFIX } from './common'
import { ProviderMeta, ProviderOpts, ProviderContext } from './provider'
import { ModuleMeta, PluginMeta } from './module_ref'

export type RefKind = 'module' | 'plugin' | 'provider'

export function pluginDecorator(
  pluginName: string,
  meta: {} | ((prop: string) => {})
): MethodDecorator {
  return (target, prop) => {
    if (typeof prop === 'symbol') return
    meta = typeof meta === 'function' ? meta(prop) : meta
    Reflect.defineMetadata(`${PREFIX}:${pluginName}`, meta, target, prop)
  }
}

export function refDecorator<TVars extends Record<string, string>, TOpts extends ProviderOpts<TVars> = ProviderOpts<TVars>>(
  ref: RefKind,
  metaType: { new (ref: Function, opts: TOpts): ProviderMeta<TVars> }
): (opts: TOpts) => ClassDecorator {
  return opts => {
    let providers = opts.providers || []
    return type => {
      Reflect.defineMetadata(`${PREFIX}:ref`, ref, type)
      const paramTypes = Reflect.getMetadata('design:paramtypes', type) as any[] || []
      paramTypes
        .map((paramType, index) =>  {
          if (
            typeof paramType !== 'function' ||
            Container.handlers.find(handler => handler.object === type && handler.index === index)
          ) return null
          if (
            paramType === ProviderContext ||
            Object.getPrototypeOf(paramType) === ProviderContext
          ) return (container: ContainerInstance) => meta.injectContext(container)
          const paramMeta = Reflect.getMetadata(`${PREFIX}:provider`, paramType)
          if (paramMeta instanceof ProviderMeta) {
            if (!providers.includes(paramType)) providers = [...providers, paramType]
            return (container: ContainerInstance) => paramMeta.inject(container)
          }
          return null
        })
        .forEach((value, index) => {
          if (!value) return
          Container.registerHandler({object: type, index, value})
        })
      const meta = new metaType(type, {...opts, providers})
      Reflect.defineMetadata(`${PREFIX}:${ref}`, meta, type)
    }
  }
}

export const ProviderRef = (name: string, vars = {}) => (
  refDecorator('provider', ProviderMeta)({name, vars})
)
export const PluginRef = (name: string, vars = {}) => (
  refDecorator('plugin', PluginMeta)({name, vars})
)

export const ModuleRef = (name: string, vars = {}, ...plugins: Function[]) => (
  refDecorator('module', ModuleMeta)({name, vars, plugins})
)
