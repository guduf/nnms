import { Module, ModuleContext, Topic } from 'nnms'
import { Server as WebSocketServer } from 'ws'
import { fromEvent, merge as mergeObs, Observable, from } from 'rxjs'
import { first, tap, merge, share, mergeMap } from 'rxjs/operators'
import WebSocket from 'ws'
import { LogRecord } from './schemas/log_record'
import { Collection } from 'nnms-common'

export const API_VARS = {
  PORT: '9063'
}

@Module('api', API_VARS)
export class Api {
  init = this._init()
  private readonly _logStream: Observable<LogRecord>

  constructor(
    private _ctx: ModuleContext<typeof API_VARS>,
    @Collection(LogRecord)
    private readonly _logs: Collection<LogRecord>,
    @Topic(LogRecord)
    logTopic: Topic<LogRecord>
  ) {
    this._logStream = logTopic.pipe(share())
    this._logStream.subscribe()
  }

  getLogs(): Observable<LogRecord> {
    return from(this._logs.find({})).pipe(
      mergeMap(logs => from(logs)),
      merge(this._logStream)
    )
  }

  private _handleConnection(ws: WebSocket): void {
    this._ctx.logger.info('HANDLE_CONNECTION', {url: ws.url})
    this.getLogs().subscribe(log => ws.send(log))
  }

  private async _init(): Promise<void> {
    const port = +this._ctx.vars.PORT
    this._ctx.logger.debug('try to create web socket server')
    const server = new WebSocketServer({port})
    await fromEvent(server, 'listening').pipe(first()).toPromise()
    this._ctx.logger.info('SERVER_LISTENING', {port})
    mergeObs(
      fromEvent<[WebSocket]>(server, 'connection').pipe(tap(([ws]) => this._handleConnection(ws))),
      fromEvent(server, 'error').pipe(tap(err => this._ctx.crash(new Error(`server error\n${err}`))))
    ).subscribe()
  }
}
