import 'reflect-metadata'
import { Container, ContainerInstance } from 'typedi'
import { CommonOpts, CommonMeta, PREFIX } from './common';

export function refDecorator<TVars extends Record<string, string>, TOpts extends CommonOpts<TVars> = CommonOpts<TVars>>(
  ref: 'module' | 'plugin',
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

export function getClassMeta<T>(metaSuffix: 'module' | 'plugin', target: Function): T {
  if (typeof target !== 'function') throw new TypeError('target is not a function')
  return Reflect.getMetadata(`${PREFIX}:${metaSuffix}`, target)
}
