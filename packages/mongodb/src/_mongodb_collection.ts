import { Collection as NativeCollection, FilterQuery, UpdateQuery } from 'mongodb'

import MongoDbProvider from './mongodb_provider'
import { ErrorObject } from 'ajv'

export interface MongoDbCollection<T> {
  readonly native: Promise<NativeCollection<T>>
  find(query: FilterQuery<T>): Promise<T[]>
  insert(...data: T[]): Promise<void>
  upsert(query: FilterQuery<T>, data: T): Promise<void>
  update(query: FilterQuery<T>, data: UpdateQuery<T>): Promise<void>
  remove(query: FilterQuery<T>): Promise<void>
  validate(data: T): Promise<ErrorObject[] | null>
}

export class MongoDbCollectionImpl<T> implements MongoDbCollection<T> {
  readonly native: Promise<NativeCollection<T>>

  constructor(
    private readonly _mongodb: MongoDbProvider,
    private readonly type: { new(): T }
  ) {
    this.native = this._mongodb.connect(type)
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
    await native.updateMany(query, data, {upsert: true})
  }

  async update(query: FilterQuery<T>, data: UpdateQuery<T>): Promise<void> {
    const native = await this.native
    await native.updateMany(query, data)
  }

  async remove(query: FilterQuery<T>): Promise<void> {
    const native = await this.native
    await native.remove(query)
  }

  validate(data: T): Promise<ErrorObject[] | null> {
    return this._mongodb.validate(this.type, data)
  }
}
