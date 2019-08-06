import { ProviderContext, ProviderRef, ModuleMeta, ErrorWithCatch, PREFIX } from 'nnms'

import { EventbusPlugin, EventbusHandlerMeta } from './eventbus_plugin'
import NatsProvider from './nats_provider'

export interface EventbusMessage {

}

export interface EventbusProxyMessage extends EventbusMessage {
  method: string
  args: unknown[]
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

  createProxy<T>(moduleType: { new(...args: any[]): T }): T {
    const modMeta = Reflect.getMetadata(`${PREFIX}:module`, moduleType) as ModuleMeta
    if (!(modMeta instanceof ModuleMeta)) throw new Error('invalid module meta')
    this._ctx.logger.debug(`create proxy for module '${modMeta.name}'`)
    const pluginMeta = modMeta.plugins.find(pluginMeta => pluginMeta.type === EventbusPlugin)
    if (!pluginMeta) throw new Error('module has no eventbus plugin')
    return Object.keys(moduleType.prototype).reduce((acc, methodKey) => {
      const handlerMeta = Reflect.getMetadata(`${PREFIX}:plugin:eventbus`, moduleType.prototype, methodKey)
      if (!(handlerMeta instanceof EventbusHandlerMeta)) return acc
      return {
        ...acc,
        [methodKey]: (
          handlerMeta instanceof EventbusHandlerMeta ?
            this._proxy(modMeta, handlerMeta) :
            () => Promise.reject('proxy not implemented')
        )
      }
    }, {} as T)
  }

  registerProxy(name: string, proxy: { [key: string]: (...args: unknown[]) =>  Promise<unknown> }): void {
    this._ctx.logger.debug(`register proxy of module '${name}'`, {methods: Object.keys(proxy)})
    this._nats.subscribeRequest(`eb.proxy.${name}`, async (e: EventbusProxyMessage) => {
      if (typeof proxy[e.method] !== 'function') throw new Error('missing proxy method')
      let result: any
      try {
        result = await proxy[e.method](...e.args)
      } catch (catched) {
        const err = new ErrorWithCatch(`proxy method '${e.method}' of module '${name}' failed`, catched)
        /* TODO: get the catched message when loggin err */
        this._ctx.logger.error(err.message, catched)
        throw err
      }
      return result
    })
  }

  private _proxy<T, P extends string & keyof T>(
    modMeta: ModuleMeta,
    handlerMeta: EventbusHandlerMeta
  ): T[P] {
    if (!(handlerMeta instanceof EventbusHandlerMeta)) throw new Error('invalid method')
    return ((...args: unknown[]) => {
      const e: EventbusProxyMessage = {args, method: handlerMeta.propName}
      return this._nats.requestOnce(`eb.proxy.${modMeta.name}`, e)
    }) as unknown as T[P]
  }
}

