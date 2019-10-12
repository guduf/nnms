import 'reflect-metadata'

import { Collection as NativeCollection, ObjectId } from 'mongodb'

import MongoDbProvider from './mongodb_provider'

import { JsonObject } from 'type-fest'
import Container from 'typedi'

import { SCHEMA_METADATA_KEY, PROPS_META_KEY, MongoDbPropMeta } from './mongodb_meta'
import { BsonType, BsonSchema } from './mongodb_schema'

export interface FindOptions<T = {}, U extends Partial<T> = {}> {
  projection?: (keyof U)[]
  limit?: number
  sort?: JsonObject
}

export function MongoDb<T>(type: { new (): T }): ParameterDecorator {
  return (target, _, index): void => {
    Container.registerHandler({object: target, index, value: () => {
      if (!Container.has(MongoDbProvider)) throw new Error('missing mongodb')
      return Container.get(MongoDbProvider).connect(type)
    }})
  }
}

export type MongoDb<T> = Promise<NativeCollection<T>>

export function MongoDbSchema(name: string): ClassDecorator {
  return target => {
    const props = (
      Reflect.getMetadata(PROPS_META_KEY, target.prototype) as Record<string, MongoDbPropMeta> || {}
    )
    const meta = {name, props}
    Reflect.defineMetadata(SCHEMA_METADATA_KEY, meta, target)
  }
}

export function reflectBsonType(target: Object, propKey: string): BsonType | null {
  const propType = Reflect.getMetadata('design:type', target, propKey)
  switch (propType) {
    case ObjectId: return 'objectId'
    case String: return 'string'
    case Number: return 'int'
    case Boolean: return 'bool'
    case Buffer: return 'binData'
    case Array: return 'array'
    case Date: return 'date'
    default: {
      return null
    }
  }
}

export interface MongoDbPropOpts {
  type?: BsonType
  required?: boolean
  items?: BsonSchema
  properties?: BsonSchema['properties']
  unique?: boolean
}

export function MongoDbProp(
  requiredOrOpts: boolean | MongoDbPropOpts = false,
  opts: MongoDbPropOpts = {}
): PropertyDecorator {
  opts = (
    typeof requiredOrOpts === 'boolean' ?
    {required: requiredOrOpts, ...opts} :
    {...requiredOrOpts, ...opts}
  )
  return (target, propKey) => {
    if (typeof propKey === 'symbol') return
    const bsonType = opts.type || reflectBsonType(target, propKey)
    const required = Boolean(opts.required)
    const unique = Boolean(opts.unique)
    if (!bsonType) throw new Error(
      `invalid bson type for property '${propKey}' of class (${target})`
    )
    const props = (
      Reflect.getMetadata(PROPS_META_KEY, target) || {}
    ) as Record<string, MongoDbPropMeta>
    const meta: MongoDbPropMeta = {bsonType, required, unique}
    Reflect.defineMetadata(PROPS_META_KEY, {...props, [propKey]: meta}, target)
  }
}

