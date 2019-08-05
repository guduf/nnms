import { ProviderContext, ProviderRef, PluginRef, pluginDecorator, PluginContext, ModuleMeta } from 'nnms'

import NatsProvider from './provider'

export interface EventbusMessage {

}

export interface ModuleProxyMessage {
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
  ) {
    !this._ctx
    !this._nats
  }

  proxy<T, P extends string & keyof T>(
    moduleType: { new (...args: any[]): T },
    methodKey: P
  ): T[P] {
    const modMeta = Reflect.getMetadata(`nnms:module`, moduleType)
    if (!(modMeta instanceof ModuleMeta)) throw new Error('invalid method')
    /* TODO: use dynamic prefix */
    const handlerMeta = Reflect.getMetadata(`nnms:eventbus`, moduleType.prototype, methodKey)
    if (!(handlerMeta instanceof EventbusHandlerMeta)) throw new Error('invalid method')
    return ((...args: unknown[]) => {
      const e: ModuleProxyMessage = {args}
      return this._nats.requestOnce(`${modMeta.name}.${methodKey}`, e)
    }) as unknown as T[P]
  }
}

export interface EventbusHandlerOpts {
  subject: string
}

export class EventbusHandlerMeta {
  subject: string

  constructor(opts: EventbusHandlerOpts) {
   this.subject  = opts.subject
  }
}

export function EventbusHandler(subject?: string) {
  return pluginDecorator('eventbus', propName => {
    return new EventbusHandlerMeta({subject: subject || propName})
  })
}

@PluginRef('eventbus')
export class EventbusPlugin {
  design: { paramType: any[]}

  constructor(
    private _ctx: PluginContext,
    nats: NatsProvider
  ) {
    this._ctx.moduleMethods.forEach(({func, meta}) => {
      !func
      !nats
      if (!(meta instanceof EventbusHandlerMeta)) throw new Error('Invalid meta')
      const paramTypes: any[] =  Reflect.getMetadata('design:paramtypes', this._ctx.moduleMeta.type.prototype, meta.subject)
      paramTypes.forEach(paramType => checkParamBsonType(paramType))
      nats.subscribeRequest(`${this._ctx.moduleMeta.name}.${meta.subject}`, func)
      this._ctx.logger.debug(`request handler subscribed for method '${meta.subject}'`)
    })
  }

  private _initProxy(): any {
    const methodMap = this._ctx.moduleMethods.reduce((acc, moduleMethod) => ({
      ...acc,
      [moduleMethod.prop]: moduleMethod
    }), {} as { [key: string]: PluginContext['moduleMethods'][number] })
    return this._ctx.moduleMethods.reduce((acc, {prop, func}) => ({
      ...acc,
      [prop]: async (...args: any[]): Promise<unknown> => func(args)
    }), {} as { [prop: string]: (...args: any) => Promise<unknown>})
  }
}

export function checkParamBsonType(paramType: any): void {
  if (![String, Number, Boolean, Buffer, Date].includes(paramType)) throw new Error('Invalid bson param type')
}
