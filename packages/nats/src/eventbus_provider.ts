import { ProviderRef, ProviderContext, ModuleMeta, PREFIX } from 'nnms'

import NatsProvider from './nats_provider'

import { Observable } from 'rxjs'

import { JsonArray, JsonValue } from 'type-fest'

export const EVENTBUS_VARS = {
  TIMEOUT: '10800',
  SUBJECT_PREFIX: 'eb.proxy'
}

export interface EventbusProxyMessage  {
  methodKey: string
  args: JsonArray
}

export type ProxyMethod = (...args: JsonArray) => Promise<JsonValue> | Observable<JsonValue>

export interface ProxyMethods {
  readonly [key: string]: ProxyMethod
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
      case Promise: this.returnType = 'promise'; break
      case Observable: this.returnType = 'observable'; break
      default: throw new Error('invalid return type')
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
