import bodyParser from 'body-parser'
import express, { Express, Handler, IRouterMatcher, Request, Response } from 'express'

import { definePropMeta, Plugin, PluginContext, getPropsMeta, PropDecorator, reflectMethodTypes } from 'nnms'

import { WebSocketProvider } from './provider'
import { Observable } from 'rxjs'

const WEB_SOCKET_METAKEY = 'ws'

const WEB_SOCKET_PLUGIN_VARS = {
  'WS_PORT': ''
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'HEAD'

export type HttpReqType = 'json' | 'text' | 'raw' | 'none'
export type HttpResType = HttpReqType | 'redirect'

export interface WebSocketRouteOpts {
  path?: string
}

export class WebSocketRouteMeta {
  readonly target: Function
  readonly path: string

  constructor(
    proto: object,
    key: string,
    opts = {} as WebSocketRouteOpts
  ) {
    this.target = proto[key]
    const {returnType} = reflectMethodTypes(proto, key)
    if (returnType !== Observable) throw new Error('Web socket route must return observable')
    this.path = opts.path || this.target.name
  }
}

export const WebSocketRoute = definePropMeta<[string | undefined]>((proto, method, arg) => {
  const opts = (typeof arg === 'string' ? {path: arg} : {}) as WebSocketRouteOpts
  return {[WEB_SOCKET_METAKEY]: new WebSocketRouteMeta(proto, method, opts)}
}) as (path?: string) => PropDecorator

@Plugin('ws', WEB_SOCKET_PLUGIN_VARS)
export class WebSocketPlugin {
  readonly init: Promise<void>

  constructor(
    private readonly _ctx: PluginContext<typeof WEB_SOCKET_PLUGIN_VARS>,
    _ws: WebSocketProvider
  ) {
    const proto = this._ctx.moduleMeta.target.prototype as Record<string, Function>
    const propsMeta = getPropsMeta(proto, WEB_SOCKET_METAKEY)
    const methods = Object.keys(propsMeta).reduce((acc, key) => {
      const func = proto[key]
      const meta = propsMeta[key]
      return {
        before: (
          meta instanceof HttpHookMeta && meta.kind === 'before' ? func : acc.before
        ),
        routes: [
          ...acc.routes,
          ...(
            meta instanceof HttpRouteMeta ?
              [{func: func.bind(this._ctx.moduleInstance) as (req: Request) => any, meta: meta}] :
              []
          )
        ],
        after: (
          meta instanceof HttpHookMeta && meta.kind === 'after' ? func : acc.after
        )
      }
    }, {
      before: null as Function | null,
      after: null as Function | null,
      routes: [] as { func: (req: Request) => any, meta: HttpRouteMeta }[]
    })
    const app = express()
    const routeMatchers: { [P in HttpMethod]: IRouterMatcher<Express>} = {
      'GET': app.get.bind(app),
      'POST': app.post.bind(app),
      'PUT': app.put.bind(app),
      'PATCH': app.patch.bind(app),
      'HEAD': app.head.bind(app)
    }
    const bodyParsers: { [P in HttpReqType]: Handler } = {
      'json': bodyParser.json(),
      'text': bodyParser.text(),
      'raw': bodyParser.raw(),
      'none': (_, __, next) => next()
    }
    if (methods.before) try { methods.before(app) } catch (catched) {
      // TODO log catched error
      const err = new Error('Failed to execute before http routes hook')
      this._ctx.logger.error('BEFORE_HOOK', err)
    }
    methods.routes.forEach(method => this._registerRoute(routeMatchers, bodyParsers, method))
    if (methods.after) try { methods.after(app) } catch(catched) {
      // TODO log catched error
      const err = new Error('Failed to execute after http routes hook')
      this._ctx.logger.error('AFTER_HOOK', err)
    }
    this.init = _http.startServer(this._ctx.moduleMeta.name, this._ctx.vars.HTTP_PORT, app)
  }

  private _registerRoute(
    routeMatchers: { [P in HttpMethod]: IRouterMatcher<Express>},
    bodyParsers: { [P in HttpReqType]: Handler },
    {meta, func}: { func: (req: Request) => any, meta: HttpRouteMeta }
  ): void {
    const finalHandler: Handler = async (req: Request, res: Response) => {
      let result: any
      try {
        let promise: Promise<any> = func(req)
        if (!(promise instanceof Promise)) promise = Promise.resolve(promise)
        result = await promise
      } catch (err) {
        this._ctx.logger.error('HTTP_REQUEST', err)
        res.status(500).end()
      }
      res.send(result)
    }
    routeMatchers[meta.method](
      meta.path,
      bodyParsers[meta.reqType],
      ...meta.middlewares,
      finalHandler
    )
    this._ctx.logger.info(
      'REGISTER_ROUTE',
      {path: meta.path, method: meta.method,reqType: meta.reqType, resType: meta.resType},
      {routes: {insert: [{method: meta.method, path: meta.path}]}}
    )
  }
}
