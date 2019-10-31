import { ErrorObject } from 'ajv'
import { Collection as NativeCollection, FilterQuery, UpdateQuery } from 'mongodb'
import Container from 'typedi'

import { Database } from './database'
import { reflectSchema, Validator } from 'nnms'

export class MongoDbCollection<T> {
  readonly native: Promise<NativeCollection<T>>
  readonly validate: (data: T) => ErrorObject[] | null

  constructor(
    private readonly _db: Database,
    readonly target: { new(): T }
  ) {
    const schema = reflectSchema(target)
    if (!schema) throw new Error('invalid schema')
    this.validate = Validator.compile(schema)
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
  return (target, _, index): void => {
    Container.registerHandler({object: target, index, value: () => {
      if (!Container.has(Database)) throw new Error('missing database provider')
      return new MongoDbCollection(Container.get(Database), type)
    }})
  }
}

export type Collection<T> = MongoDbCollection<T>

