import { ErrorObject } from 'ajv'
import { Collection as NativeCollection, FilterQuery, UpdateQuery } from 'mongodb'
import Container from 'typedi'

import { Database } from './database'

export class MongoDbCollection<T> {
  readonly native: Promise<NativeCollection<T>>

  constructor(
    private readonly _db: Database,
    private readonly type: { new(): T }
  ) {
    this.native = this._db.connect(type)
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

  validate(data: T): Promise<ErrorObject[] | null> {
    return this._db.validate(this.type, data)
  }
}

export function Collection<T>(type: { new (): T }): ParameterDecorator {
  return (target, _, index): void => {
    Container.registerHandler({object: target, index, value: () => {
      if (!Container.has(Database)) throw new Error('missing database provider')
      return new MongoDbCollection(Container.get(Database), type)
    }})
  }
}

export type Collection<T> = MongoDbCollection<T>

