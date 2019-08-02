import { Client, connect } from 'nats'
import { ProviderRef, ProviderContext, ErrorWithCatch } from 'nnms'
import { Service } from 'typedi'
import { Observable } from 'rxjs'

const NATS_VARS = {
  URL: 'nats://localhost:4222'
}

@Service({global: true})
@ProviderRef({name: 'nats', vars: NATS_VARS})
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
}
