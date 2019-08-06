import { ApplicationContext } from './application_ref'

import { Container } from 'typedi'

export const PREFIX = 'nnms'
export const PREFIX_UPPER = PREFIX.toUpperCase()


export function getApplicationRef(): ApplicationContext {
  if (!Container.has(ApplicationContext as any)) throw new Error('Container has no ApplicationRef')
  const appRef = Container.get(ApplicationContext as any) as any
  if (!(appRef instanceof ApplicationContext)) throw new Error('ApplicationRef is not valid instance')
  return appRef
}

export function getMethodPluginMetas<T>(
  pluginName: string,
  instance: {}
): { [prop: string]: T } {
  const proto = Object.getPrototypeOf(instance)
  return Object.getOwnPropertyNames(proto).reduce((acc, prop) => {
    if (prop === 'constructor') return acc
    const meta = Reflect.getMetadata(`${PREFIX}:plugin:${pluginName}`, proto, prop)
    return {...acc, ...(meta ? {[prop]: meta} : {})}
  }, {} as { [prop: string]: T })
}
