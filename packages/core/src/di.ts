import 'reflect-metadata'
import { Container, ContainerInstance } from 'typedi'
import { CommonOpts, CommonMeta, PREFIX } from './common';

export type RefKind = 'module' | 'plugin' | 'provider'

export function refDecorator<TVars extends Record<string, string>, TOpts extends CommonOpts<TVars> = CommonOpts<TVars>>(
  ref: RefKind,
  metaCtor: { new (ref: Function, opts: TOpts): CommonMeta<TVars> }
): (opts: TOpts) => ClassDecorator {
  return opts => {
    return target => {
      const meta = new metaCtor(target, opts)
      Reflect.defineMetadata(`${PREFIX}:ref`, ref, target)
      Reflect.defineMetadata(`${PREFIX}:${ref}`, meta, target)
    }
  }
}

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

export function getClassMeta<T>(refKind: RefKind, target: Function): T {
  if (typeof target !== 'function') throw new TypeError('target is not a function')
  return Reflect.getMetadata(`${PREFIX}:${refKind}`, target)
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

export function getPluginMeta<T>(
  pluginName: string,
  instance: {}
): { [prop: string]: T } {
  const proto = Object.getPrototypeOf(instance)
  return Object.getOwnPropertyNames(proto).reduce((acc, prop) => {
    if (prop === 'constructor') return acc
    const meta = Reflect.getMetadata(`${PREFIX}:${pluginName}`, proto, prop)
    return {...acc, ...(meta ? {[prop]: meta} : {})}
  }, {} as { [prop: string]: T })
}
