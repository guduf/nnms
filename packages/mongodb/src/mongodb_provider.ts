import { connect, MongoClient, Collection, MongoError } from 'mongodb'
import { ProviderRef, ProviderContext } from 'nnms'

import { SCHEMA_METADATA_KEY, MongoDbSchemaMeta } from './mongodb_meta'
import { BsonSchema } from './mongodb_schema'

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

  async connect<T>(type: { new (): T }): Promise<Collection<T>> {
    const meta = Reflect.getMetadata(SCHEMA_METADATA_KEY, type) as MongoDbSchemaMeta
    if (!this._collections[meta.name]) try {
      this._collections[meta.name] = this._load(meta)
    } catch (err) {
      this._ctx.logger.error('LOAD_COLLECTION', err)
    }
    return this._collections[meta.name];
  }

  private async _load(meta: MongoDbSchemaMeta): Promise<Collection> {
    await this.init
    this._ctx.logger.metric('load collection', {
      collections: {$insert: [{name: meta.name, loaded: 'pending'}]}
    })
    const {props, required} = Object.keys(meta.props).reduce((acc, key) => {
      const prop = {...meta.props[key]}
      delete prop.required
      delete prop.unique
      return {
        props: {...acc.props, [key]: prop},
        required: [...acc.required, ...(meta.props[key].required ? [key] : [])],
        unique: [...acc.unique, ...(meta.props[key].unique ? [key] : [])]
      }
    }, {props: {} as BsonSchema['properties'], required: [] as string[], unique: [] as string[]})
    const schema: BsonSchema = {
      bsonType: 'object',
      required,
      properties: props
    }
    const db = this._client.db(this._ctx.vars.DATABASE)
    try {
      const {ok} = await (db.command({
        collMod: meta.name,
        validator: {$jsonSchema: schema},
        validationLevel: 'moderate',
        validationAction: 'error'
      }) as Promise<{ok: boolean}>)
      if (!ok) throw new Error(`collection check is not OK`)
    } catch (err) {
      if (!(err instanceof MongoError && err.code === 26)) throw err
      await db.createCollection(meta.name, {validator: {$jsonSchema: schema}})
    }
    this._ctx.logger.info('LOAD_COLLECTION', {collection: meta.name}, {
      collections: {$metricKey: 'name', $upsert: [{name: meta.name, loaded: true}]}
    })
    return db.collection(meta.name)
  }

  private async _init(): Promise<void> {
    this._ctx.logger.metric({client: {$insert: [{url: this._ctx.vars.URL, status: 'pending'}]}})
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
      client: {$metricKey: 'url', $patch: [{url: this._ctx.vars.URL, status: 'opened'}]}
    })
  }
}

export default MongoDbProvider
