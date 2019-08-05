import { Client, connect, NatsError, REQ_TIMEOUT } from 'nats'
import { ProviderRef, ProviderContext, ErrorWithCatch } from 'nnms'
import { Service } from 'typedi'
import { Observable } from 'rxjs'
import { ModuleProxyMessage } from './eventbus';

const NATS_VARS = {
  URL: 'nats://localhost:4222'
}

@Service({global: true})
@ProviderRef('nats', NATS_VARS)
export class NatsProvider {
  private readonly _client: Client

  constructor(
    private _ctx: ProviderContext<typeof NATS_VARS>
  ) {
    try {
      this._client = connect({url: this._ctx.vars.URL, json: true})
      this._client.on('error', err => this._ctx.logger.error(err))
    } catch (catched) {
      const err = new ErrorWithCatch('client connection failed', catched)
      this._ctx.logger.error(err)
      throw err
    }
    this._ctx.logger.info(`Nats listenning on '${this._ctx.vars.URL}'`)
  }

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

  requestOnce<R>(subject: string, body: {}, timeout = 10800): Promise<R> {
    return new Promise((resolve, reject) => {
      this._client.requestOne(subject, body, timeout, (res: R |NatsError) => {
        if (res instanceof NatsError && res.code === REQ_TIMEOUT) {
          const err = new ErrorWithCatch(`Request failed '${subject}': ${res.message}`, res.chainedError)
          this._ctx.logger.error(err)
          return reject(err)
        }
        resolve(res as R)
      })
    })
  }

  async subscribeRequest(subject: string, handler: (args: unknown[]) => any): Promise<number> {
    return this._client.subscribe(subject, async (e: ModuleProxyMessage, replyTo: string) => {
      const res = await handler(e.args)
      this._client.publish(replyTo, res);
    })
  }
}

export default NatsProvider
