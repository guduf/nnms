import Container from 'typedi'
import { JsonValue, JsonArray } from 'type-fest'
import { ModuleMeta, PREFIX } from 'nnms'


import { PluginRef, pluginMethodDecorator, PluginContext } from 'nnms'
import { Observable } from 'rxjs';
import { Eventbus, getProxyMethodsMeta, ProxyMethods, ProxyMethod, EventbusHandlerMeta } from './eventbus_provider';

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
        this._ctx.logger.error('PROXY_METHOD', {methodKey: meta.methodKey})
        throw catched
      }
      return result
    }
  }
}
