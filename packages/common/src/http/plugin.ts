import bodyParser from 'body-parser'
import express, { Express, Handler, IRouterMatcher, Request, Response } from 'express'

import { Plugin, PluginContext, pluginMethodDecorator } from 'nnms'

import { HttpProvider } from './provider'

const HTTP_PLUGIN_VARS = {
  'HTTP_PORT': ''
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'HEAD'

export type HttpReqType = 'json' | 'text' | 'raw' | 'none'
export type HttpResType = HttpReqType | 'redirect'

export interface HandlerOpts {
  path: string
  method: HttpMethod
  reqType: HttpReqType
  resType: HttpResType
}

const DEFAULT_HANDLER_OPTS: HandlerOpts = {
  path: '/',
  method: 'GET',
  reqType: 'json',
  resType: 'json'
}

export class HttpRouteMeta implements HandlerOpts {
  path: string
  method: HttpMethod
  reqType: HttpReqType
  resType: HttpResType

  constructor(opts: Partial<HandlerOpts>, readonly middlewares: Handler[]) {
    for (const key in DEFAULT_HANDLER_OPTS) {
      this[key as keyof this] = (
        opts[key as keyof HandlerOpts] ||
        DEFAULT_HANDLER_OPTS[key as keyof typeof DEFAULT_HANDLER_OPTS] as any
      )
    }
  }
}

export function HttpRoute(
  arg: string | Partial<HandlerOpts> | Handler = {},
  ...middlewares: Handler[]
) {
  const opts = typeof arg === 'object' ? typeof arg === 'string' ? {path: arg} : arg : {}
  const meta = new HttpRouteMeta(opts, middlewares)
  return pluginMethodDecorator('http', meta)
}

export class HttpHookMeta {
  constructor(readonly kind: 'before' | 'after') { }
}

export function BeforeHttpRoutes() {
  const meta = new HttpHookMeta('before')
  return pluginMethodDecorator('http', meta)
}

export function AfterHttpRoutes() {
  const meta = new HttpHookMeta('after')
  return pluginMethodDecorator('http', meta)
}

@Plugin('http', HTTP_PLUGIN_VARS)
export class HttpPlugin {
  readonly init: Promise<void>

  constructor(
    private readonly _ctx: PluginContext<typeof HTTP_PLUGIN_VARS>,
    _http: HttpProvider
  ) {
    const methods = Object.keys(this._ctx.moduleMeta.methods).reduce((acc, key) => {
      const {extras: {'http': httpExtra}, func} = this._ctx.moduleMeta.methods[key]
      if (!httpExtra) return acc
      return {
        before: (
          httpExtra instanceof HttpHookMeta && httpExtra.kind === 'before' ? func : acc.before
        ),
        routes: [
          ...acc.routes,
          ...(
            httpExtra instanceof HttpRouteMeta ?
              [{func, meta: httpExtra}] :
              []
          )
        ],
        after: (
          httpExtra instanceof HttpHookMeta && httpExtra.kind === 'after' ? func : acc.after
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
