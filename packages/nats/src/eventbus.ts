import Container from 'typedi'

import { ProviderContext, ProviderRef, ModuleMeta, PREFIX } from 'nnms'

import NatsProvider from './nats_provider'

export interface EventbusMessage {

}

export interface EventbusProxyMessage extends EventbusMessage {
  method: string
  args: unknown[]
}

import { PluginRef, pluginMethodDecorator, PluginContext, pluginParamDecorator } from 'nnms'


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
  constructor(target: Function, modType: { new (...args: any[]): any }, index: number) {
    Container.registerHandler({object: target, index, value: () => {
      const eventbus = Container.get(Eventbus)
      if (!(eventbus instanceof Eventbus)) throw new Error('failed to fetch eventbus')
      return eventbus.createProxy(modType)
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

export const EVENTBUS_VARS = {
  TIMEOUT: '10800'
}

@ProviderRef('eventbus', EVENTBUS_VARS)
export class Eventbus {
  constructor(
    private _ctx: ProviderContext<typeof EVENTBUS_VARS>,
    private _nats: NatsProvider
  ) { }

  registerProxy(name: string, proxy: { [key: string]: (...args: unknown[]) =>  Promise<unknown> }): void {
    this._ctx.logger.debug({message: `register proxy of module '${name}'`, methods: Object.keys(proxy)})
    this._nats.subscribeRequest(`eb.proxy.${name}`, async (e: EventbusProxyMessage) => {
      if (typeof proxy[e.method] !== 'function') throw new Error('missing proxy method')
      let result: any
      try {
        result = await proxy[e.method](...e.args)
      } catch (catched) {
        this._ctx.logger.error('FAILED_PROXY', catched)
        throw catched
      }
      return result
    })
  }

  createProxy<T>(modType: {new (...args: any[]): T }): T {
    const modMeta = Reflect.getMetadata(`${PREFIX}:module`, modType) as ModuleMeta
    if (!(modMeta instanceof ModuleMeta)) throw new Error('invalid module meta')
    this._ctx.logger.debug(`create proxy for module '${modMeta.name}'`)
    return Object.keys(modType.prototype).reduce((acc, methodKey) => {
      const handlerMeta = Reflect.getMetadata(`${PREFIX}:plugin:eventbus`, modType.prototype, methodKey)
      if (!(handlerMeta instanceof EventbusHandlerMeta)) return acc
      return {
        ...acc,
        [methodKey]: (
          handlerMeta instanceof EventbusHandlerMeta ?
            this.proxy(modMeta, handlerMeta) :
            () => Promise.reject('proxy not implemented')
        )
      }
    }, {} as T)
  }

  proxy<T, P extends string & keyof T>(modMeta: ModuleMeta, handlerMeta: EventbusHandlerMeta): T[P] {
    if (!(handlerMeta instanceof EventbusHandlerMeta)) throw new Error('invalid method')
    return ((...args: unknown[]) => {
      const e: EventbusProxyMessage = {args, method: handlerMeta.propName}
      return this._nats.requestOnce(`eb.proxy.${modMeta.name}`, e).then(e => { console.log({e}); process.exit(1); return e})
    }) as unknown as T[P]
  }
}

@PluginRef('eventbus')
export class EventbusPlugin {
  constructor(
    private readonly _ctx: PluginContext,
    private readonly _eventbus: Eventbus
  ) {
    const proxy = this._ctx.moduleMethods.reduce((acc, {prop, func}) => (
      {...acc, [prop]: func}
    ), {} as { [prop: string]: (...args: unknown[]) => Promise<unknown>})
    if (Object.keys(proxy).length) this._eventbus.registerProxy(this._ctx.moduleMeta.name, proxy)
  }
}

