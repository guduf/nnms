import 'reflect-metadata'
import { Container, ContainerInstance } from 'typedi'
import { PREFIX } from './common'
import { ProviderMeta, ProviderOpts, ProviderContext } from './provider'
import { PluginMeta } from './plugin_ref'
import { ModuleMeta } from './module_ref'

export type RefKind = 'module' | 'plugin' | 'provider'

export function refParams(container: ContainerInstance, type: Function): any[] {
  const paramTypes = Reflect.getMetadata('design:paramtypes', type) as any[]
  return paramTypes.map((paramType, index) => {
    const paramHandler = Container.handlers.find(handler => (
      handler.object === type && handler.index === index
    ))
    if (paramHandler) return paramHandler.value(container)
    if (paramType && paramType.name && !(container as any).isTypePrimitive(paramType.name)) {
      return container.get(paramType)
    }
    return undefined
  })
}

export function getClassMeta<T>(refKind: RefKind, target: Function): T | null {
  if (typeof target !== 'function') throw new TypeError('target is not a function')
  return Reflect.getMetadata(`${PREFIX}:${refKind}`, target) || null
}

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
  ref: 'provider' | 'module' | 'plugin',
  metaType: { new (ref: Function, opts: TOpts): ProviderMeta<TVars> }
): (opts: TOpts) => ClassDecorator {
  return opts => {
    return type => {
      const meta = new metaType(type, opts)
      Reflect.defineMetadata(`${PREFIX}:ref`, ref, type)
      Reflect.defineMetadata(`${PREFIX}:${ref}`, meta, type)
      const paramTypes = Reflect.getMetadata('design:paramtypes', type) as any[] || []
      paramTypes
        .map((paramType, index) =>  {
          if (
            typeof paramType !== 'function' ||
            Container.handlers.find(handler => handler.object === type && handler.index === index)
          ) return null
          if (
            paramType === ProviderContext ||
            Object.getPrototypeOf( paramType) === ProviderContext
          ) return (container: ContainerInstance) => meta.injectContext(container)
          const paramMeta = Reflect.getMetadata(`${PREFIX}:provider`, paramType)
          if (paramMeta instanceof ProviderMeta) return (
            (container: ContainerInstance) => paramMeta.inject(container)
          )
          return null
        })
        .forEach((value, index) => {
          if (!value) return
          Container.registerHandler({object: type, index, value})
        })
    }
  }
}

export const ProviderRef = refDecorator('provider', ProviderMeta)
export const PluginRef = refDecorator('plugin', PluginMeta)
export const ModuleRef = refDecorator('module', ModuleMeta)
