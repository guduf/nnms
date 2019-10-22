import 'reflect-metadata'

import { ObjectId } from 'mongodb'
import Container from 'typedi'

import { MongoDbCollection as _MongoDbCollection, MongoDbCollectionImpl } from './_mongodb_collection'
import MongoDbProvider from './mongodb_provider'

import { SCHEMA_METADATA_KEY, PROPS_META_KEY, MongoDbPropMeta, reflectMongoDbSchema } from './mongodb_meta'
import { BsonType, BsonSchema, BSON_TYPES } from './mongodb_schema'

export function MongoDbCollection<T>(type: { new (): T }): ParameterDecorator {
  return (target, _, index): void => {
    Container.registerHandler({object: target, index, value: () => {
      if (!Container.has(MongoDbProvider)) throw new Error('missing mongodb')
      return new MongoDbCollectionImpl(Container.get(MongoDbProvider), type)
    }})
  }
}

export type MongoDbCollection<T> = _MongoDbCollection<T>

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
  bsonType?: BsonType
  required?: boolean
  items?: BsonSchema
  properties?: BsonSchema['properties']
  unique?: boolean
  enum?: any[]
}

export function getPropBsonType(
  type: BsonType | Function | MongoDbPropOpts | [BsonType] | [Function] | [MongoDbPropOpts]
): Partial<MongoDbPropOpts> {
  if (Array.isArray(type)) {
    if (type.length !== 1) throw new Error('type tupple must has exactly one item')
    return {bsonType: 'array', items: getPropBsonType(type[0]) as BsonSchema}
  }
  if (typeof type === 'function') return reflectMongoDbSchema(type) as Partial<MongoDbPropOpts>
  if (typeof type === 'string') {
    if (!BSON_TYPES.includes(type)) throw new Error('invalid bson type')
    return {bsonType: type}
  }
  return type
}

export function MongoDbProp(
  typeOrRequiredOrOpts: BsonType | Function | MongoDbPropOpts | [BsonType] | [Function] | [MongoDbPropOpts] | boolean = {},
  optsOrRequired: MongoDbPropOpts | boolean = {}
): PropertyDecorator {
  return (target, propKey) => {
    const type = typeof typeOrRequiredOrOpts === 'boolean' ? null : getPropBsonType(typeOrRequiredOrOpts)
    const meta = {
      ...(
        type ? type :
          typeof typeOrRequiredOrOpts === 'object' ? typeOrRequiredOrOpts :
            typeof typeOrRequiredOrOpts === 'boolean' ? {required: typeOrRequiredOrOpts} :
              {}
      ),
      ...(
        typeof optsOrRequired === 'object' ? optsOrRequired :
          typeof optsOrRequired === 'boolean' ? {required: optsOrRequired} :
          {}
      )
    } as Partial<MongoDbPropOpts>
    if (typeof propKey === 'symbol') return
    const bsonType = meta.bsonType || reflectBsonType(target, propKey)
    if (!bsonType) throw new Error(
      `invalid bson type for property '${propKey}' of class (${target})`
    )
    const props = (
      Reflect.getMetadata(PROPS_META_KEY, target) || {}
    ) as Record<string, MongoDbPropMeta>
    Reflect.defineMetadata(PROPS_META_KEY, {...props, [propKey]: {bsonType, ...meta}}, target)
  }
}
