import { ApplicationContext } from './application'

import { Container } from 'typedi'

export const PREFIX = 'nnms'
export const PREFIX_UPPER = PREFIX.toUpperCase()


export function getApplicationContext(): ApplicationContext {
  if (!Container.has(ApplicationContext as any)) throw new Error('Container has no ApplicationContext')
  const appCtx = Container.get(ApplicationContext as any) as any
  if (!(appCtx instanceof ApplicationContext)) throw new Error('ApplicationContext is not valid instance')
  return appCtx
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
