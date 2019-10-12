import { Observable } from 'rxjs'
import { JsonValue } from 'type-fest'
import WebSocket, { Server as WebSocketServer } from 'ws'

import { LoggerEvent } from 'nnms'

import { LogStore } from './log_store'

export interface SocketRequest {
  method: string
  topic: string
}

export interface SocketBaseResponse<T extends JsonValue = {}> {
  data?: T
  err?: { code: string, msg: string }
  topic: string
}

export interface SocketErrorResponse extends SocketBaseResponse<never> {
  err: { code: string, msg: string }
}
export interface SocketSuccessResponse<T extends JsonValue = {}>  extends SocketBaseResponse<T> {
  data: T
}

export type SocketResponse<T extends JsonValue = {}> = (
  SocketSuccessResponse<T> | SocketErrorResponse
)

export default class LogSocket {
  private readonly _store: LogStore
  private readonly _wss: WebSocketServer

  constructor(port: number, events: Observable<LoggerEvent>) {
    this._store = new LogStore(events)
    this._wss = new WebSocketServer({port})
    this._wss.on('connection', socket => {
      socket.on('message', msg => this._handleRequest(socket, msg as string))
    })
  }

  _handleRequest(socket: WebSocket, body: string): void {
    const req = JSON.parse(body) as SocketRequest
    const {topic} = req
    let events: Observable<JsonValue>
    switch (req.method) {
      case 'getAllLogs': events = this._store.getAllLogs(); break
      default: {
        const res: SocketErrorResponse = {
          topic,
          err: {code: 'SOCKET_METHOD', msg: 'invalid method'}
        }
        socket.send(JSON.stringify(res))
        return
      }
    }
    events.subscribe(
      data => socket.send(JSON.stringify({topic, data})),
      err => socket.send(JSON.stringify({topic, err: {code: 'SOCKET_INTERNAL', msg: err.message}}))
    )
  }
}

