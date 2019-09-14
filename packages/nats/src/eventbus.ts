import Container from 'typedi'
import { JsonValue, JsonArray } from 'type-fest'
import { ModuleMeta, ProviderContext, ProviderRef, PREFIX } from 'nnms'

import NatsProvider from './nats_provider'

export interface EventbusMessage {

}

export interface EventbusProxyMessage extends EventbusMessage {
  methodKey: string
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
      Reflect.getMetadata('design:returntype', this.moduleType, this.methodKey)
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

export function EventbusProxy(): ParameterDecorator {
  return (target, _, index): void => {
    const paramTypes = Reflect.getMetadata('design:paramtypes', target) || []
    const modMeta = Reflect.getMetadata(`${PREFIX}:module`, paramTypes[index])
    if (!(modMeta instanceof ModuleMeta)) throw new Error('invalid proxy module')
    Container.registerHandler({object: target, index, value: () => {
      if (!Container.has(Eventbus)) throw new Error('missing eventbus')
      return Container.get(Eventbus).buildProxyClient(modMeta)
    }})
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
      if (typeof proxyMethods[e.methodKey] !== 'function') throw new Error(
        `missing proxy method with key '${e.methodKey}'`
      )
      let result: any
      try {
        result = await proxyMethods[e.methodKey](...e.args)
      } catch (catched) {
        this._ctx.logger.error('FAILED_PROXY', catched)
        throw catched
      }
      return result
    })
  }

  async requestProxyOnce<T>(modName: string, e: EventbusProxyMessage): Promise<T> {
    // TODO - rewrite with rx
    let res: T
    try {
      res = await this._nats.requestOnce(`${this._subjectPrefix}.${modName}`, e)
    } catch (err) {
      res = await this._nats.requestOnce(`${this._subjectPrefix}.${modName}`, e)
    }
    return res
  }

  requestProxyMany<T>(modName: string, e: EventbusProxyMessage): Observable<T> {
    return this._nats.requestMany(`${this._subjectPrefix}.${modName}`, e)
  }

  buildProxyClient(modMeta: ModuleMeta): ProxyMethods {
    const proxyMetas = getProxyMethodsMeta(modMeta)
    if (!proxyMetas) throw new Error(
      `${modMeta.name} module has not proxy methods`
    )
    return Object.keys(proxyMetas).reduce((acc, methodKey) => {
      const proxyMeta = proxyMetas[methodKey]
      const fun: ProxyMethod = (...args: JsonArray) => {
        if (!proxyMeta) throw new Error('proxy method not implemented')
        const topic = modMeta.name
        if (proxyMeta.returnType === 'promise') {
          return this.requestProxyOnce(topic, {methodKey, args})
        }
        return this.requestProxyMany(topic, {methodKey, args})
      }
      return {...acc, [methodKey]: fun}
    }, {} as ProxyMethods)
  }
}

@PluginRef('eventbus')
export class EventbusPlugin {
  constructor(
    private readonly _ctx: PluginContext,
    private readonly _eventbus: Eventbus
  ) {
    const proxyMethodsMeta = getProxyMethodsMeta(this._ctx.moduleMeta)
    if (proxyMethodsMeta) {
      const proxyMethods = Object.keys(proxyMethodsMeta).reduce((acc, methodKey) => (
        {...acc, [methodKey]: this._proxyMethod(proxyMethodsMeta![methodKey]!)}
      ), {} as ProxyMethods)
      this._eventbus.registerProxy(this._ctx.moduleMeta.name, proxyMethods)
    }
  }

  private _proxyMethod(meta: EventbusHandlerMeta): ProxyMethod {
    if (!meta) return () => { throw new Error('proxy method not implemented') }
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
}

export function getProxyMethodsMeta(modMeta: ModuleMeta): { [key: string]: EventbusHandlerMeta | null } | null {
  const modProto = modMeta.type.prototype
  return Object.keys(modProto).reduce((acc, methodKey) => {
    const handlerMeta = Reflect.getMetadata(`${PREFIX}:plugin:eventbus`, modProto, methodKey)
    if (handlerMeta instanceof EventbusHandlerMeta) {
      return {...(acc || {}), [methodKey]: handlerMeta}
    }
    return acc ? {...acc, [methodKey]: null} : null
  }, null as { [key: string]: EventbusHandlerMeta | null } | null)
}
