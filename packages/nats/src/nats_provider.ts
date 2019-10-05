import { connect, NatsError, REQ_TIMEOUT } from 'nats'
import { ProviderRef, ProviderContext, ErrorWithCatch } from 'nnms'
import { Observable, merge, fromEvent, throwError, Subject, defer } from 'rxjs'
import { mergeMap, first, map, retry } from 'rxjs/operators'

const NATS_VARS = {
  URL: 'nats://localhost:4222',
  REQUEST_TIMEOUT: '3000',
  REQUEST_RETRIES: '3'
}

@ProviderRef('nats', NATS_VARS)
export class NatsProvider {
  constructor(
    private _ctx: ProviderContext<typeof NATS_VARS>
  ) { }

  private readonly _client = connect({url: this._ctx.vars.URL, json: true})
  private readonly _reqTimeout = +this._ctx.vars.REQUEST_TIMEOUT || +NATS_VARS.REQUEST_TIMEOUT
  private readonly _reqRetries = +this._ctx.vars.REQUEST_RETRIES || +NATS_VARS.REQUEST_RETRIES

  readonly init = this._init()

  publish<T>(subject: string, msg: T): Promise<void> {
    return new Promise((resolve, reject) => (
      this._client.publish(subject, msg, (err: Error) => err ? reject(err) : resolve())
    ))
  }

  watch<T>(subject: string): Observable<T> {
    return new Observable(subscriber => {
      const sid = this._client.subscribe(subject, (e: T) => subscriber.next(e))
      return () => this._client.unsubscribe(sid)
    })
  }

  requestOnce<R>(subject: string, body: {}): Promise<R> {
    return defer(() => this._requestOnce<R>(subject, body))
      .pipe(retry(this._reqRetries))
      .toPromise()
  }

  requestMany<R>(subject: string, body: {}): Observable<R> {
    const sub = new Subject<R>()
    this._client.request(subject, body, (res: R | NatsError) => {
      if (res instanceof NatsError) {
        const err = new ErrorWithCatch(`Request failed '${subject}': ${res.message}`, res.chainedError)
        this._ctx.logger.error('REQUEST_MANY', err)
        sub.error(err)
        return sub.complete()
      }
      sub.next(res)
    })
    return sub.asObservable()
  }

  subscribeRequest<T>(subject: string, handler: (e: T) => any): number {
    return this._client.subscribe(subject, (e: T, replyTo: string) => {
      let result: any
      try {
        result = handler(e)
      } catch (catched) {
        result = new NatsError(`handler for subject '${subject}' failed`, 'HANDLER_FAILURE')
        this._ctx.logger.error(result.code, catched)
      }
      if (result instanceof Observable) result.subscribe(
        e => this._client.publish(replyTo, e),
        catched => {
          const err = new NatsError(`handler for subject '${subject}' failed`, 'HANDLER_FAILURE')
          this._ctx.logger.error(result.code, catched)
          this._client.publish(replyTo, err)
        }
      )
      else if (result instanceof Promise) result.then(e => this._client.publish(replyTo, e))
      else this._client.publish(replyTo, result)
    })
  }

  private async _init(): Promise<void> {
    this._ctx.logger.metric({client: {$insert: [{url: this._ctx.vars.URL, status: 'pending'}]}})
    try {
      await this._connect()
    } catch (err) {
      this._ctx.logger.error('CONNECTION', err.message)
      throw err
    }
    this._ctx.logger.info(`CLIENT_LISTENING`, {url: this._ctx.vars.URL}, {
      client: {$metricKey: 'url', $patch: [{url: this._ctx.vars.URL, status: 'opened'}]}
    })
  }

  private _connect(): Promise<void> {
    const connectEvents = [
      fromEvent(this._client, 'connect').pipe(map(() => { })),
      fromEvent(this._client, 'error').pipe(mergeMap(err => throwError(err)))
    ]
    return merge(...connectEvents).pipe(first()).toPromise()
  }

  private _requestOnce<R>(subject: string, body: {}): Promise<R> {
    return new Promise((resolve, reject) => {
      this._client.requestOne(subject, body, this._reqTimeout, (res: R | NatsError) => {
        if (res instanceof NatsError && res.code === REQ_TIMEOUT) return reject(res)
        resolve(res as R)
      })
    })
  }
}

export default NatsProvider
