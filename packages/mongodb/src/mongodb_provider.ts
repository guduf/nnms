import { connect, MongoClient, Collection } from 'mongodb'
import { ProviderRef, ProviderContext } from 'nnms'

import MongoDbSchema from './mongodb_schema'

const MONGODB_VARS = {
  URL: 'mongodb://localhost:27017'
}

@ProviderRef('mongodb', MONGODB_VARS)
export class MongoDbProvider {
  constructor(
    private _ctx: ProviderContext<typeof MONGODB_VARS>
  ) { }

  private _client: MongoClient

  readonly init = this._init()

  getCollection(schema: MongoDbSchema): Collection {
    return this._client.db('test').collection(schema.name)
  }

  private async _init(): Promise<void> {
    this._ctx.logger.metric({client: {$insert: [{url: this._ctx.vars.URL, status: 'pending'}]}})
    try {
      this._client = await connect(this._ctx.vars.URL)
    } catch (err) {
      this._ctx.logger.error('FAILED_CONNECTION', err.message)
      throw err
    }
    this._ctx.logger.info(`CLIENT_LISTENING`, {url: this._ctx.vars.URL}, {
      client: {$metricKey: 'url', $patch: [{url: this._ctx.vars.URL, status: 'opened'}]}
    })
  }
}

export default MongoDbProvider
