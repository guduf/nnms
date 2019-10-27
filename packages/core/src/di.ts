import 'reflect-metadata'
import { Container, ContainerInstance } from 'typedi'
import { PREFIX, ResourceMeta, ResourceOpts, getContainerContext, ResourceContext, ResourceKind, getResourceMeta } from './resource'
import { ProviderMeta } from './provider'
import { ModuleMeta, } from './module'
import { PluginMeta } from './plugin'

/* Decorates a module method for a specific plugin. */
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

/* Decorates a module parameter for a specific plugin. */
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

export type ResourceMetaType<TVars extends Record<string, string>, TOpts extends ResourceOpts<TVars> = ResourceOpts<TVars>> = { new (ref: Function, opts: TOpts): ResourceMeta<TVars> }

/* Builds a decorator function for a specific kind and meta type. */
export function buildResourceDecorator<TVars extends Record<string, string>, TOpts extends ResourceOpts<TVars> = ResourceOpts<TVars>>(
  kind: ResourceKind,
  metaType: ResourceMetaType<TVars, TOpts>
): (opts: TOpts) => ClassDecorator {
  return opts => {
    let providers = opts.providers || []
    return type => {
      Reflect.defineMetadata(`${PREFIX}:ref`, kind, type)
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
        const paramMeta = getResourceMeta('provider', paramType)
        if (paramMeta instanceof ProviderMeta) {
          if (!providers.includes(paramType)) providers = [...providers, paramType]
          return () => Container.get(paramMeta.type)
        }
        return null
      })
        .forEach((value, index) => {
          if (!value) return
          Container.registerHandler({object: type, index, value})
        })
      const meta = new metaType(type, {...opts, providers})
      Reflect.defineMetadata(`${PREFIX}:${kind}`, meta, type)
    }
  }
}

/** Decorates a class with provider meta. */
export const Provider = (name: string, vars: Record<string, string>, ...providers: Function[]) => (
  buildResourceDecorator('provider', ProviderMeta)({name, vars, providers})
)

/** Decorates a class with plugin meta. */
export const Plugin = (name: string, vars: Record<string, string>, ...providers: Function[]) => (
  buildResourceDecorator('plugin', PluginMeta)({name, vars, providers})
)

/** Decorates a class with module meta. */
export const Module = (name: string, vars: Record<string, string>, ...pluginsAndProviders: Function[]) => (
  buildResourceDecorator('module', ModuleMeta)({name, vars, pluginsAndProviders})
)
