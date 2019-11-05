import { Module, ModuleContext, Topic } from 'nnms'
import { Server as WebSocketServer } from 'ws'
import { fromEvent, merge, Observable } from 'rxjs'
import { first, tap, share } from 'rxjs/operators'
import WebSocket from 'ws'
import { LogRecord } from './schemas/log_record'

export const API_VARS = {
  PORT: '9063'
}

@Module('api', API_VARS)
export class Api {
  init = this._init()
  logs: Observable<LogRecord>

  constructor(
    private _ctx: ModuleContext<typeof API_VARS>,
    @Topic(LogRecord)
    logTopic: Topic<LogRecord>
  ) {
    this.logs = logTopic.pipe(share())
    this.logs.subscribe()
  }

  private _handleConnection(ws: WebSocket): void {
    this._ctx.logger.info('HANDLE_CONNECTION', {url: ws.url})
  }

  private async _init(): Promise<void> {
    const port = +this._ctx.vars.PORT
    this._ctx.logger.debug('try to create web socket server')
    const server = new WebSocketServer({port})
    await fromEvent(server, 'listening').pipe(first()).toPromise()
    this._ctx.logger.info('SERVER_LISTENING', {port})
    merge(
      fromEvent<WebSocket>(server, 'connection').pipe(tap(ws => this._handleConnection(ws))),
      fromEvent(server, 'error').pipe(tap(err => this._ctx.crash(new Error(`server error\n${err}`))))
    ).subscribe()
  }
}
