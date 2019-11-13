import { Collection as NativeCollection, FilterQuery, UpdateQuery } from 'mongodb'

import { decorateParameter, reflectSchema, Validator, injectProvider, ValidatorError } from 'nnms'

import { Database } from './database'

export class MongoDbCollection<T> {
  readonly native: Promise<NativeCollection<T>>
  readonly validate: (data: T) => ValidatorError[] | null

  constructor(
    private readonly _db: Database,
    readonly target: { new(): T }
  ) {
    const meta = reflectSchema(target)
    if (!meta) throw new Error('cannot reflect schema meta')
    this.validate = Validator.compile({$ref: meta.id})
    this.native = this._db.connect(target)
  }

  async find(query: FilterQuery<T>): Promise<T[]> {
    const native = await this.native
    return native.find(query).toArray()
  }

  async findOne(query: FilterQuery<T>): Promise<T> {
    const [doc] = await this.find(query)
    if (!doc) throw new Error('missing doc')
    return doc
  }

  async insert(...data: T[]): Promise<void> {
    const native = await this.native
    await native.insertMany(data)
  }

  async upsert(query: FilterQuery<T>, data: T): Promise<void> {
    const native = await this.native
    await native.replaceOne(query, data, {upsert: true})
  }

  async update(query: FilterQuery<T>, data: UpdateQuery<T>): Promise<void> {
    const native = await this.native
    await native.updateMany(query, data)
  }

  async remove(query: FilterQuery<T>): Promise<void> {
    const native = await this.native
    await native.remove(query)
  }
}

export function Collection<T>(type: { new (): T }): ParameterDecorator {
  return decorateParameter(() => {
    const database = injectProvider(Database)
    return new MongoDbCollection(database, type)
  })
}

export type Collection<T> = MongoDbCollection<T>

