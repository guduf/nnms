import { PluginRef, pluginMethodDecorator, PluginContext, pluginParamDecorator } from 'nnms'

import Container from 'typedi'
import { Eventbus } from './eventbus_provider'

export class EventbusHandlerMeta {
  moduleType: Function
  propName: string

  constructor(opts: EventbusHandlerMeta) {
   this.propName  = opts.propName
   this.moduleType  = opts.moduleType
  }
}

export interface EventbusProxyOpts {
  target: any
  paramIndex: number
}

export class EventbusProxyMeta {
  constructor(target: Function, moduleType: { new (...args: any[]): any }, index: number) {
    Container.registerHandler({object: target, index, value: () => {
      const eventbus = Container.get(Eventbus)
      if (!(eventbus instanceof Eventbus)) throw new Error('invalid eventbus')
      return eventbus.createProxy(moduleType)
    }})
  }
}

export function EventbusProxy(): ParameterDecorator {
  return pluginParamDecorator('eventbus', (target, _, index) => {
   const paramTypes = Reflect.getMetadata('design:paramtypes', target) || []
   if (typeof paramTypes[index] != 'function') throw new Error('invalid proxy target')
    new EventbusProxyMeta(target, paramTypes[index], index)
  })
}

export function EventbusHandler(): MethodDecorator {
  return pluginMethodDecorator('eventbus', (moduleType, propName) => (
    new EventbusHandlerMeta({moduleType, propName})
  ))
}

@PluginRef('eventbus')
export class EventbusPlugin {
  constructor(
    ctx: PluginContext,
    eventbus: Eventbus
  ) {
    const proxy = ctx.moduleMethods.reduce((acc, {prop, func}) => ({
      ...acc,
      [prop]: func
    }), {} as { [prop: string]: (...args: unknown[]) => Promise<unknown>})
    if (Object.keys(proxy).length) eventbus.registerProxy(ctx.moduleMeta.name, proxy)
  }
}

export default EventbusPlugin
