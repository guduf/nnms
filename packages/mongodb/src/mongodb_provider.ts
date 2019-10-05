import { connect, MongoClient, Collection, MongoError } from 'mongodb'
import { ProviderRef, ProviderContext } from 'nnms'

import MongoDbSchema from './mongodb_schema'

const MONGODB_VARS = {
  URL: 'mongodb://localhost:27017',
  DATABASE: 'test'
}

@ProviderRef('mongodb', MONGODB_VARS)
export class MongoDbProvider {
  constructor(
    private readonly _ctx: ProviderContext<typeof MONGODB_VARS>
  ) { }

  private readonly _collections = {} as { [name: string]: Promise<Collection> }
  private _client: MongoClient

  readonly init = this._init()

  async connect(schema: MongoDbSchema): Promise<Collection> {
    if (!schema || typeof schema !== 'object' || typeof schema.name !== 'string' || !schema.name) {
      throw new Error('invalid schema')
    }
    if (!this._collections[schema.name]) try {
      this._collections[schema.name] = this._load(schema)
    } catch (err) {
      this._ctx.logger.error('LOAD_COLLECTION', err)
    }
    return this._collections[schema.name];
  }

  private async _load(schema: MongoDbSchema): Promise<Collection> {
    if (!schema.name) throw new Error('invalid schema name')
    await this.init
    this._ctx.logger.metric('load collection', {
      collections: {$insert: [{name: schema.name, loaded: 'pending'}]}
    })
    const db = this._client.db(this._ctx.vars.DATABASE)
    const jsonSchema = {...schema}
    delete jsonSchema.name
    try {
      const {ok} = await (db.command({
        collMod: schema.name,
        validator: {$jsonSchema: jsonSchema},
        validationLevel: 'moderate',
        validationAction: 'error'
      }) as Promise<{ok: boolean}>)
      if (!ok) throw new Error(`collection check is not OK`)
    } catch (err) {
      if (!(err instanceof MongoError && err.code === 26)) throw err
      await db.createCollection(schema.name, {validator: {$jsonSchema: jsonSchema}})
    }
    this._ctx.logger.info('LOAD_COLLECTION', {collection: schema.name}, {
      collections: {$metricKey: 'name', $upsert: [{name: schema.name, loaded: true}]}
    })
    return db.collection(schema.name)
  }

  private async _init(): Promise<void> {
    this._ctx.logger.metric({client: {$insert: [{url: this._ctx.vars.URL, status: 'pending'}]}})
    try {
      this._client = await connect(this._ctx.vars.URL)
    } catch (err) {
      this._ctx.logger.error('CONNECTION', err.message)
      throw err
    }
    this._ctx.logger.info(`CLIENT_LISTENING`, {url: this._ctx.vars.URL}, {
      client: {$metricKey: 'url', $patch: [{url: this._ctx.vars.URL, status: 'opened'}]}
    })
  }
}

export default MongoDbProvider
