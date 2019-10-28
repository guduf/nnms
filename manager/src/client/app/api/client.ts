import { first, map, mergeMap, shareReplay, tap } from 'rxjs/operators'
import { fromEvent, Observable, Subject, EMPTY, throwError, of, Subscription, merge } from 'rxjs'
import { ApiResponse, ApiRequest, ApiSuccessResponse } from '~shared/api'
import { ObjectId, serialize, deserialize } from 'bson'
import { deserializeError } from 'serialize-error'

export class ApiClient {
  constructor(private readonly _ws: WebSocket) {
    this._crash = new Subject<Error>()
    this.crash = this._crash.pipe(shareReplay(1))
    this._ready = fromEvent(this._ws, 'open').pipe(
      first(),
      map(() => console.log(`🚀  Manager API ready on '${this._ws.url}'`)),
      shareReplay(1)
    )
    this._subscr = merge(
      this._crash.pipe(tap(crash => this._handleCrash(crash))),
      this._ready,
      fromEvent(this._ws, 'close').pipe(tap(() => this._crash.next(new Error('unexpected close')))),
      fromEvent<Buffer>(this._ws, 'message').pipe(
        tap(msg => this._handleMessage(msg))
      )
    ).subscribe(undefined, err => this._crash.next(err))
  }

  private readonly _crash: Subject<Error>
  private readonly _ready: Observable<void>
  private readonly _responses: Subject<ApiResponse>
  private readonly _subscr: Subscription

  readonly crash: Observable<Error>

  request<T>(input: Omit<ApiRequest, 'id'>): Observable<T> {
    return this._ready.pipe(mergeMap(() => {
      const id = new ObjectId()
      const req = serialize({...input, id} as ApiRequest)
      const data = this._responses.pipe(mergeMap(res => {
        if (res.reqId !== id) return EMPTY
        if (res.error) return throwError(deserializeError(res.error))
        return of((res as ApiSuccessResponse<T>).data)
      }))
      if (this._ws.CLOSED) return throwError(new Error('websocket is closed'))
      this._ws.send(req)
      return data
    }))
  }

  private _handleMessage(message: Buffer): void {
    let res: ApiResponse
    try { res = deserialize(message) } catch (err) {
      return console.error(`❗️ cannot deserialize api response\n`, err)
    }
    this._responses.next(res)
  }
  private _handleCrash(crash: Error) {
    if (crash) console.error(`❗️ client crash\n`, crash)
    this._crash.complete()
    this._responses.complete()
    this._subscr.unsubscribe()
    if (this._ws.OPEN) this._ws.close(crash ? 1 : 0)
  }
}
