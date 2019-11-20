import express from 'express'

import { Provider, ProviderContext } from 'nnms'
import WebSocket, { Server as WebSocketServer } from 'ws'
import { fromEvent, merge, Subscription } from 'rxjs'
import { first, tap } from 'rxjs/operators'

@Provider('ws', {})
export class WebSocketProvider {
  constructor(
    private readonly _ctx: ProviderContext<{}>
  ) { }

  async startServer(
    name: string,
    port: number,
    handler: (ws: WebSocket) => void
  ): Promise<void> {
    this._ctx.logger.debug('try to create web socket server')
    const server = new WebSocketServer({port})
    await fromEvent(server, 'listening').pipe(first()).toPromise()
    this._ctx.logger.info('SERVER_LISTENING', {name, port})
    merge(
      fromEvent<[WebSocket]>(server, 'connection').pipe(tap(([ws]) => handler(ws))),
      fromEvent(server, 'error').pipe(tap(err => this._ctx.crash(new Error(`server error\n${err}`))))
    ).subscribe()
  }
}
