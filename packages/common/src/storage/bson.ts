export { Decimal128, Double, ObjectId, Timestamp } from 'bson'

import { JSONSchema4 } from 'json-schema'
import { Decimal128, Double, ObjectId, Timestamp } from 'bson'

export const BSON_TYPES = [
  'double',
  'string',
  'object',
  'array',
  'binData',
  'objectId',
  'bool',
  'date',
  'null',
  'int',
  'timestamp',
  'long',
  'decimal',
] as const

export type BsonType = typeof BSON_TYPES[number]

export interface BsonSchema extends JSONSchema4 {
  bsonType: BsonType | [BsonType]
  type?: never
  additionalItems?: boolean | BsonSchema
  items?: BsonSchema | BsonSchema[]
  additionalProperties?: boolean | BsonSchema
  definitions?: { [k: string]: BsonSchema }
  properties?: { [k: string]: BsonSchema }
  patternProperties?: { [k: string]: BsonSchema }
  dependencies?: { [k: string]: BsonSchema | string[] }
  allOf?: BsonSchema[]
  anyOf?: BsonSchema[]
  oneOf?: BsonSchema[]
  not?: BsonSchema
}

export function reflectBsonType(target: Object, propKey: string): BsonType | null {
  const propType = Reflect.getMetadata('design:type', target, propKey)
  switch (propType) {
    case Array: return 'array'
    case Boolean: return 'bool'
    case Buffer: return 'binData'
    case Date: return 'date'
    case Decimal128: return 'decimal'
    case Double: return 'double'
    case Number: return 'int'
    case ObjectId: return 'objectId'
    case String: return 'string'
    case Timestamp: return 'timestamp'
    default: {
      return null
    }
  }
}

export default BsonSchema