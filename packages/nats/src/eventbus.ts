import Container from 'typedi'
import { JsonValue, JsonArray } from 'type-fest'
import { ModuleMeta, ProviderContext, ProviderRef, PREFIX } from 'nnms'

import NatsProvider from './nats_provider'

export interface EventbusMessage {

}

export interface EventbusProxyMessage extends EventbusMessage {
  method: string
  args: JsonArray
}

import { PluginRef, pluginMethodDecorator, PluginContext } from 'nnms'
import { Observable } from 'rxjs';

export type ProxyMethod = (...args: JsonArray) => Promise<JsonValue> | Observable<JsonValue>

export interface ProxyMethods {
  readonly [key: string]: ProxyMethod
}

export class EventbusHandlerMeta {
  readonly returnType: 'promise' | 'observable'

  constructor(
    readonly moduleType: Function,
    readonly methodKey: string
  ) {
    const typeofReturn = (
      Reflect.getMetadata('design:returnType', this.moduleType.prototype, this.methodKey)
    )
    switch (typeofReturn) {
      case Promise:
        this.returnType = 'promise'
        break
      case Observable:
        this.returnType = 'observable'
        break
      default:
        throw new Error('invalid return type')
    }
  }
}

export function EventbusHandler(): MethodDecorator {
  return pluginMethodDecorator('eventbus', (moduleType, propName) => (
    new EventbusHandlerMeta(moduleType, propName)
  ))
}

export interface EventbusProxyOpts {
  target: any
  paramIndex: number
}

export class EventbusProxyMeta {
  constructor(target: Function, modType: { new (...args: any[]): any }, index: number) {
    Container.registerHandler({object: target, index, value: () => {
      const modMeta = Reflect.getMetadata(`${PREFIX}:module`, modType)
      const plugin = Container.of(modMeta).get(EventbusPlugin)
      return plugin.buildProxyClient()
    }})
  }
}

export function EventbusProxy(): ParameterDecorator {
  return (target, _, index): void => {
    const paramTypes = Reflect.getMetadata('design:paramtypes', target) || []
    const modMeta = Reflect.getMetadata(`${PREFIX}:module`, paramTypes[index])
    if (!(modMeta instanceof ModuleMeta)) throw new Error('invalid proxy module')
    const plugin = Container.of(modMeta).get(EventbusPlugin)
    Container.registerHandler({object: target, index, value: () => plugin.buildProxyClient()})
  }
}

export const EVENTBUS_VARS = {
  TIMEOUT: '10800',
  SUBJECT_PREFIX: 'eb.proxy'
}

@ProviderRef('eventbus', EVENTBUS_VARS)
export class Eventbus {
  private get _subjectPrefix() { return this._ctx.vars.SUBJECT_PREFIX }

  constructor(
    private _ctx: ProviderContext<typeof EVENTBUS_VARS>,
    private _nats: NatsProvider
  ) { }

  registerProxy(name: string, proxyMethods: ProxyMethods): void {
    this._ctx.logger.metric({
      proxies: {$upsert: [{name, methods: Object.keys(proxyMethods).join(', ')}]}
    })
    this._nats.subscribeRequest(`${this._subjectPrefix}.${name}`, async (e: EventbusProxyMessage) => {
      if (typeof proxyMethods[e.method] !== 'function') throw new Error('missing proxy method')
      let result: any
      try {
        result = await proxyMethods[e.method](...e.args)
      } catch (catched) {
        this._ctx.logger.error('FAILED_PROXY', catched)
        throw catched
      }
      return result
    })
  }

  requestProxyOnce<T>(modName: string, e: EventbusMessage): Promise<T> {
    return this._nats.requestOnce(`${this._subjectPrefix}.${modName}`, e)
  }

  requestProxyMany<T>(modName: string, e: EventbusMessage): Observable<T> {
    return this._nats.requestMany(`${this._subjectPrefix}.${modName}`, e)
  }
}

@PluginRef('eventbus')
export class EventbusPlugin {
  private readonly _proxyMethodsMeta: { [key: string]: EventbusHandlerMeta | null } | null
  private _proxyClient: ProxyMethods

  constructor(
    private readonly _ctx: PluginContext,
    private readonly _eventbus: Eventbus
  ) {
    this._proxyMethodsMeta = this._getProxyMethodsMeta()
    if (this._proxyMethodsMeta) {
      const proxyMethods = Object.keys(this._proxyMethodsMeta).reduce((acc, methodKey) => (
        {...acc, [methodKey]: this._proxyMethod(this._proxyMethodsMeta![methodKey]!)}
      ), {} as ProxyMethods)
      this._eventbus.registerProxy(this._ctx.moduleMeta.name, proxyMethods)
    }
  }

  private _getProxyMethodsMeta(): { [key: string]: EventbusHandlerMeta | null } | null {
    const modProto = this._ctx.moduleMeta.type.prototype
    return Object.keys(modProto).reduce((acc, methodKey) => {
      const handlerMeta = Reflect.getMetadata(`${PREFIX}:plugin:eventbus`, modProto, methodKey)
      if (handlerMeta instanceof EventbusHandlerMeta) {
        return {...(acc || {}), [methodKey]: handlerMeta}
      }
      return acc ? {...acc, [methodKey]: null} : null
    }, null as { [key: string]: EventbusHandlerMeta | null } | null)
  }

  private _proxyMethod(meta: EventbusHandlerMeta): ProxyMethod {
    if (!meta) () => { throw new Error('proxy method not implemented') }
    const logData =  {method: meta.methodKey, returnType: meta.returnType}
    this._ctx.logger.info(
      'REGISTER_PROXY_METHOD', logData, {
        proxyMethods: {$metricKey: 'method', $upsert: [{...logData, success: 0, error: 0}]}
      }
    )
    return (...args: JsonArray)  => {
      let result: Promise<JsonValue> | Observable<JsonValue>
      try {
        result = (this._ctx.moduleInstance as any)[meta!.methodKey](...args)
      } catch (catched) {
        this._ctx.logger.error('METHOD_PROXY_FAILED', {methodKey: meta.methodKey})
        throw catched
      }
      return result
    }
  }

  buildProxyClient(): ProxyMethods {
    const proxyMetas = this._proxyMethodsMeta
    if (!proxyMetas) throw new Error(
      `${this._ctx.moduleMeta.name} module has not proxy methods`
    )
    if (!this._proxyClient) {
      this._proxyClient = Object.keys(proxyMetas).reduce((acc, methodKey) => {
        const proxyMeta = proxyMetas[methodKey]
        const fun: ProxyMethod = (...args: JsonArray) => {
          if (!proxyMeta) throw new Error('proxy method not implemented')
          const topic = this._ctx.moduleMeta.name
          if (proxyMeta.returnType === 'promise') {
            return this._eventbus.requestProxyOnce(topic, {args})
          }
          return this._eventbus.requestProxyMany(topic, {args})
        }
        return {...acc, [methodKey]: fun}
      }, {} as ProxyMethods)
    }
    return this._proxyClient
  }
}

