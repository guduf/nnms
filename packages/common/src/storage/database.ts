import { connect, MongoClient, Collection, MongoError } from 'mongodb'
import { Provider, ProviderContext, reflectSchema } from 'nnms'

import { reflectDocMeta, DocMeta } from './meta'

const DATABASE_VARS = {
  URL: 'mongodb://localhost:27017',
  DATABASE: 'test'
}

@Provider('database', DATABASE_VARS)
export class Database {
  constructor(
    private readonly _ctx: ProviderContext<typeof DATABASE_VARS>
  ) { }

  private readonly _collections = {} as { [name: string]: Promise<Collection> }
  private _client: MongoClient

  readonly init = this._init()

  async connect<T>(target: { new (): T }): Promise<Collection<T>> {
    const meta = reflectDocMeta(target)
    if (!meta) throw new Error('cannot reflect doc meta')

    if (!this._collections[meta.collName]) try {
      this._collections[meta.collName] = this._load(meta)
    } catch (err) {
      this._ctx.logger.error('LOAD_COLLECTION', err)
    }
    return this._collections[meta.collName];
  }

  private async _load(meta: DocMeta): Promise<Collection> {
    await this.init
    this._ctx.logger.metrics('load collection', {
      collections: {insert: [{name: meta.collName, loaded: 'pending'}]}
    })
    const schema = reflectSchema(meta.target)
    if (!schema) throw new Error('invalid doc schema')
    const db = this._client.db(this._ctx.vars.DATABASE)
    try {
      const {ok} = await (db.command({
        collMod: meta.collName,
        validator: {$jsonSchema: schema},
        validationLevel: 'moderate',
        validationAction: 'error'
      }) as Promise<{ok: boolean}>)
      if (!ok) throw new Error(`collection check is not OK`)
    } catch (err) {
      if (!(err instanceof MongoError && err.code === 26)) throw err
      await db.createCollection(meta.collName, {validator: {$jsonSchema: schema}})
    }
    this._ctx.logger.info('LOAD_COLLECTION', {name: meta.collName}, {
      collections: {index: 'name', upsert: [{name: meta.collName, loaded: true}]}
    })
    const collection = db.collection(meta.collName)
    if (meta.indexes) await collection.createIndexes(meta.indexes)
    return collection
  }

  private async _init(): Promise<void> {
    this._ctx.logger.metrics({client: {insert: [{url: this._ctx.vars.URL, status: 'pending'}]}})
    try {
      this._client = await connect(this._ctx.vars.URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      })
    } catch (err) {
      this._ctx.logger.error('CONNECTION', err.message)
      throw err
    }
    this._ctx.logger.info(`CLIENT_LISTENING`, {url: this._ctx.vars.URL}, {
      client: {index: 'url', patch: [{url: this._ctx.vars.URL, status: 'opened'}]}
    })
  }
}
