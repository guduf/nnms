import { Observable, EMPTY, fromEvent, throwError, merge, of } from 'rxjs'
import { JsonObject } from 'type-fest'
import WebSocket from 'ws'

import { Log } from 'nnms'

import { LogPublicStore, LogRecord } from './log_store'
import { map, mergeMap, first, share } from 'rxjs/operators'
import shortid from 'shortid'
import { SocketResponse } from './log_socket'

export class LogStoreRemote implements LogPublicStore {
  private readonly _ws: WebSocket
  private readonly _responses: Observable<SocketResponse>

  static async create(url: string): Promise<LogStoreRemote> {
    const remote = new LogStoreRemote(url)
    const connectEvents = [
      fromEvent(remote._ws, 'open'),
      fromEvent(remote._ws, 'error').pipe(mergeMap(err => throwError(err)))
    ]
    return merge(...connectEvents).pipe(first(), map(() => remote)).toPromise()
  }

  private constructor(url: string) {
    this._ws = new WebSocket(url)
    this._responses = fromEvent<MessageEvent>(this._ws, 'message').pipe(
      map(e => JSON.parse(e.data) as SocketResponse),
      share()
    )
  }

  private _sendRequest<T extends Log>(
    method: string,
    query = {} as Record<string, string>
    // TODO - remove any assertion
  ): Observable<any> {
    const topic = shortid()
    const obs = this._responses.pipe(
      mergeMap(res => {
        if (res.topic !== topic) return EMPTY
        if (res.err) return throwError(new Error(JSON.stringify(res.err)))
        return of(res.data as T)
      })
    )
    this._ws.send(JSON.stringify({method, topic, query}))
    return obs

  }

  getAllLogs(): Observable<LogRecord> {
    return this._sendRequest('getAllLogs')
  }

  getLogs(src: string, id: string): Observable<LogRecord[]> {
    return this._sendRequest('getLogs', {src, id})
  }

  getMetrics<T extends JsonObject>(src: string, id: string): Observable<T> {
    return this._sendRequest('getMetrics', {src, id})

  }
}
