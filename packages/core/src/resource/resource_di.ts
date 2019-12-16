import 'reflect-metadata'
import { Container, ContainerInstance } from 'typedi'

import { injectContext, defineClassMeta, reflectParamsTypes } from '../di'
import { ResourceMeta, ResourceOpts, ResourceContext, ResourceKind, getResourceMeta } from './resource'

export interface ResourceMetaType<
  TVars extends Record<string, string>,
  TOpts extends ResourceOpts<TVars> = ResourceOpts<TVars>
> { new (ref: Function, opts: TOpts): ResourceMeta<TVars> }

export function defineResourceMeta<
  TVars extends Record<string, string>,
  TOpts extends ResourceOpts<TVars> = ResourceOpts<TVars>
>(kind: ResourceKind, metaType: ResourceMetaType<TVars, TOpts>): (opts: TOpts) => ClassDecorator {
  return defineClassMeta<[TOpts]>((target, opts) => {
    let providers = opts.providers || []
    const paramTypes = reflectParamsTypes(target) || []
    paramTypes.map((paramType, index) =>  {
      if (
        typeof paramType !== 'function' ||
        Container.handlers.find(handler => handler.object === target && handler.index === index)
      ) return null
      if (Object.getPrototypeOf(paramType) === ResourceContext) return (
        (container: ContainerInstance): ResourceContext => (
          kind === 'module' ? injectContext(container) : meta.buildContext(container)
        )
      )
      const paramMeta = getResourceMeta('provider', paramType)
      if (paramMeta instanceof ResourceMeta) {
        if (!providers.includes(paramType)) providers = [...providers, paramType]
        return (): unknown => injectProvider(paramMeta.target)
      }
      return null
    })
      .forEach((value, index) => {
        if (!value) return
        Container.registerHandler({object: target, index, value})
      })
    const meta = new metaType(target, {...opts, providers})
    return {[kind]: meta}
  })
}

export function injectProvider<T extends Function>(
  target: T
): T extends { new (...args: any[]): infer X } ? X : unknown {
  const meta = getResourceMeta('provider', target)
  if (!meta) throw new Error('target is not decorated with provider meta')
  if (!Container.has(target)) throw new Error(`missing provider '${meta.name}'`)
  return Container.get(target)
}
