import { Collection as NativeCollection } from 'mongodb'

import MongoDbProvider from './mongodb_provider'

import { JsonObject } from 'type-fest'
import Container from 'typedi'

import { MongoDbSchema, SCHEMA_METADATA_KEY } from './mongodb_schema'

export interface FindOptions<T = {}, U extends Partial<T> = {}> {
  projection?: (keyof U)[]
  limit?: number
  sort?: JsonObject
}

export function MongoDb<T>(type: { new (): T }): ParameterDecorator {
  return (target, _, index): void => {
    Container.registerHandler({object: target, index, value: () => {
      if (!Container.has(MongoDbProvider)) throw new Error('missing mongodb')
      const schema = Reflect.getMetadata(SCHEMA_METADATA_KEY, type) as MongoDbSchema
      return Container.get(MongoDbProvider).connect(schema)
    }})
  }
}

export type MongoDb<T> = Promise<NativeCollection<T>>
