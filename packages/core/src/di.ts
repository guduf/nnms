import 'reflect-metadata'
import { Container, ContainerInstance } from 'typedi'
import { PREFIX, ResourceMeta, ResourceOpts, getContainerContext, ResourceContext } from './common'
import { ProviderMeta } from './provider'
import { ModuleMeta, } from './module_ref'
import { PluginMeta } from './plugin'

export type RefKind = 'module' | 'plugin' | 'provider'

export function pluginMethodDecorator(
  pluginName: string,
  meta: {} | ((target: any, prop: string) => {})
): MethodDecorator {
  return (target, prop) => {
    if (typeof prop === 'symbol') return
    meta = typeof meta === 'function' ? meta(target, prop) : meta
    Reflect.defineMetadata(`${PREFIX}:plugin:${pluginName}`, meta, target, prop)
  }
}

export function pluginParamDecorator(
  pluginName: string,
  meta: {} | ((target: any, prop: string, index: number) => {})
): ParameterDecorator {
  return (target, prop, i) => {
    if (typeof prop === 'symbol') return
    meta = typeof meta === 'function' ? meta(target, prop, i) : meta
    Reflect.defineMetadata(`${PREFIX}:plugin:${pluginName}`, meta, target, `constructor[${i}]`)
  }
}

export function refDecorator<TVars extends Record<string, string>, TOpts extends ResourceOpts<TVars> = ResourceOpts<TVars>>(
  ref: RefKind,
  metaType: { new (ref: Function, opts: TOpts): ResourceMeta<TVars> }
): (opts: TOpts) => ClassDecorator {
  return opts => {
    let providers = opts.providers || []
    return type => {
      Reflect.defineMetadata(`${PREFIX}:ref`, ref, type)
      const paramTypes = Reflect.getMetadata('design:paramtypes', type) as any[] || []
      paramTypes.map((paramType, index) =>  {
        if (
          typeof paramType !== 'function' ||
          Container.handlers.find(handler => handler.object === type && handler.index === index)
        ) return null
        if (Object.getPrototypeOf(paramType) === ResourceContext) {
          return (container: ContainerInstance) => (
            meta instanceof ModuleMeta ?
              getContainerContext(container) :
              meta.buildContext(container)
          )
        }
        const paramMeta = Reflect.getMetadata(`${PREFIX}:provider`, paramType)
        if (paramMeta instanceof ProviderMeta) {
          if (!providers.includes(paramType)) providers = [...providers, paramMeta]
          return () => Container.get(paramMeta.type)
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
