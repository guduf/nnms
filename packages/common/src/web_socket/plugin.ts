import { fromEvent, merge, Subscription, Observable } from 'rxjs'
import { tap, map } from 'rxjs/operators'
import WebSocket from 'ws'

import { definePropMeta, Plugin, PluginContext, getPropsMeta, Method, SchemaInput, MethodArgInputs, MethodOpts, reflectMethod, MethodMeta, deserialize, BsonValue, ObjectId, BsonArray, serialize } from 'nnms'

import { WebSocketProvider } from './provider'

const WEB_SOCKET_METAKEY = 'ws'

const WEB_SOCKET_PLUGIN_VARS = {
  'WS_PORT': ''
}

export interface WebSocketRequest {
  id: ObjectId
  method: string
  args: BsonArray
}

export interface WebSocketResponse {
  reqId: ObjectId
  result: BsonValue
}

export interface WebSocketMethodOpts {
  path?: string
  returnType?: SchemaInput
  argTypes?: MethodArgInputs
}

export class WebSocketMethodMeta {
  readonly target: Function
  readonly path: string

  constructor(
    proto: Record<string, Function>,
    key: string,
    opts = {} as WebSocketMethodOpts
  ) {
    this.target = proto[key]
    this.path = opts.path || this.target.name
  }
}

export const WebSocketMethod = definePropMeta<[string | WebSocketMethodOpts | undefined]>((proto, method, arg) => {
  const opts = (typeof arg === 'string' ? {path: arg} : arg) as WebSocketMethodOpts
  Method({...opts as MethodOpts<'flow'>, returnKind: 'flow'})(proto, method, {})
  return {[WEB_SOCKET_METAKEY]: new WebSocketMethodMeta(proto as Record<string, Function>, method, opts)}
}) as (opts?: WebSocketMethodOpts) => PropertyDecorator

@Plugin('ws', WEB_SOCKET_PLUGIN_VARS)
export class WebSocketPlugin {
  readonly init: Promise<void>
  readonly methods: Record<string, MethodMeta>

  constructor(
    private readonly _ws: WebSocketProvider,
    private readonly _ctx: PluginContext<typeof WEB_SOCKET_PLUGIN_VARS>
  ) {
    const proto = this._ctx.moduleMeta.target.prototype as Record<string, Function>
    const propsMeta = getPropsMeta<WebSocketMethodMeta>(proto, WEB_SOCKET_METAKEY)
    this.methods = Object.keys(propsMeta).reduce((acc, key) => {
      const meta = propsMeta[key]
      const method = reflectMethod(proto, key)
      return {...acc, [meta.path]: method}
    }, {})
    this._ws.startServer(this._ctx.moduleMeta.name, +this._ctx.vars.WS_PORT, (ws: WebSocket) => this._handleConnection(ws))
  }

  private _handleConnection(ws: WebSocket): void {
    const msgObs = fromEvent<Buffer>(ws, 'message').pipe(
      tap(msg => this._handleRequest(deserialize(msg))),
      tap(res => ws.send(serialize(res)))
    )
    let subscr: Subscription
    const closeObs = fromEvent(ws, 'close').pipe(tap(() => subscr && subscr.unsubscribe()))
    subscr = merge(msgObs, closeObs).subscribe(
      undefined,
      err => {
        ws.close(1, err.message)
        this._ctx.logger.error('HANDLE_CONNECTION', err)
      },
      () => {
        console.log(ws)
        this._ctx.logger.info('CLOSE_CONNECTION')
      }
    )
  }

  private _handleRequest(req: WebSocketRequest): Observable<WebSocketResponse> {
    if (!(req.id instanceof ObjectId)) throw new Error('invalid message')
    const method = this.methods[req.method]
    if (!method) throw new Error('method not found')
    return method.func(...req.args).pipe(map(result => ({id: req.id, result})))
  }
}
