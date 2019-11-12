import 'reflect-metadata'
import { Container, ContainerInstance, Token } from 'typedi'

export const PREFIX = 'nnms'
export const PREFIX_UPPER = PREFIX.toUpperCase()

export const CONTAINER_CONTEXT_TOKEN = new Token('CONTAINER_CONTEXT')

export function injectContext<T>(optContainer?: ContainerInstance): T {
  const container = optContainer || Container
  if (!container.has(CONTAINER_CONTEXT_TOKEN)) throw new Error('container has no context')
  const ctx = container.get(CONTAINER_CONTEXT_TOKEN) as T
  return ctx
}

export function setContext(context: any, optContainer?: ContainerInstance): void {
  const container = optContainer || Container
  if (container.has(CONTAINER_CONTEXT_TOKEN)) throw new Error('container has already context')
  container.set(CONTAINER_CONTEXT_TOKEN, context)
}

export function registerParameter<T>(
  registrer: (target: Function, key: string) => T
): ParameterDecorator {
  return (target, key, index): void => {
    if (typeof key === 'symbol') throw new Error('key must be string')
    Container.registerHandler({
      object: target,
      index,
      value: () => registrer(target as Function, key)
    })
  }
}

export function defineClassMeta<TArgs extends any[] = []>(
  builder: (target: Function, ...opts: TArgs) => Record<string, any>
): (...opts: TArgs) => ClassDecorator {
  return (...opts: TArgs) => (
    target => {
      const meta = builder(target, ...opts)
      for (const key in meta) Reflect.defineMetadata(`${PREFIX}:class:${key}`, meta[key], target)
    }
  )
}

export function getClassMeta<T>(target: any, key: string): T | null {
  return Reflect.getMetadata(`${PREFIX}:class:${key}`, target) || null
}

export function definePropMeta<TArgs extends any[] = []>(
  builder: (proto: Object, prop: string, ...opts: TArgs) => Record<string, any>
): (...opts: TArgs) => PropertyDecorator {
  return (...opts: TArgs) => (
    (proto, prop) => {
      if (typeof prop !== 'string') return
      const meta = builder(proto, prop, ...opts)
      for (const key in meta) {
        Reflect.defineMetadata(`${PREFIX}:prop:${key}:${prop}`, meta[key], proto)
      }
    }
  )
}

export function getPropsMeta<T>(proto: object, key: string): Record<string, T> {
  return Reflect.getMetadataKeys(proto).reduce((acc, metaKey) => {
    if (!metaKey.startsWith(`${PREFIX}:prop:${key}`)) return acc
    const prop = metaKey.split(':').slice(-1)[0]
    return {...acc, [prop]: Reflect.getMetadata(metaKey, proto)}
  }, {} as Record<string, T>)
}

export function reflectMethodTypes(
  proto: object,
  key: string
): { argTypes: any[], returnType: any } {
  const argTypes = Reflect.getMetadata('design:paramtypes', proto, key)
  const returnType = Reflect.getMetadata('design:paramtypes', proto, key)
  return {argTypes, returnType}
}

export function reflectParamsTypes(target: Function): any[] {
  return Reflect.getMetadata('design:paramtypes', target)
}

export function decorateParameter<T>(
  registrer: (target: Function, key: string) => T | void
): ParameterDecorator {
  return (target, key, index): void => {
    if (typeof key === 'symbol') throw new Error('key must be string')
    Container.registerHandler({
      object:
      target,
      index,
      value: () => registrer(target as Function, key)
    })
  }
}
