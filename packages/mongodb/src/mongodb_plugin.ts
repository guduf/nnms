import { Collection as MongoDbCollection } from 'mongodb'
import { Container } from 'typedi'

import MongoDbProvider from './mongodb_provider'
import MongoDbSchema from './mongodb_schema'

export function Collection(schema: MongoDbSchema): ParameterDecorator {
  return (target, _, index): void => {
    Container.registerHandler({object: target, index, value: () => {
      if (!Container.has(MongoDbProvider)) throw new Error('missing mongodb')
      return Container.get(MongoDbProvider).getCollection(schema)
    }})
  }
}

export type Collection<T> = MongoDbCollection<T>
