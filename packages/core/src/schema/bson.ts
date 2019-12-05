import { JSONSchema4 } from 'json-schema'
import { Binary, Decimal128, Double, ObjectId, Timestamp } from 'bson'

export { Binary, Decimal128, Double, ObjectId, Timestamp } from 'bson'
export { serialize as serializeBson, deserialize as deserializeBson } from 'bson'

export const BSON_TYPES = {
  'string': String,
  'object': Object,
  'array': Array,
  'binData': Binary,
  'decimal': Decimal128,
  'double': Double,
  'objectId': ObjectId,
  'bool': Boolean,
  'date': Date,
  'null': null,
  'int': Number,
  'timestamp': Timestamp
} as const

export type BsonTypeName = keyof (typeof BSON_TYPES)

export type BsonType = typeof BSON_TYPES[BsonTypeName]

export type BsonObject =  { [key: string]: BsonValue }

export interface BsonArray extends Array<BsonValue> {}

export type BsonValue = string | number | boolean | Buffer | Date | null | BsonObject | BsonArray

export interface BsonSchema extends JSONSchema4 {
  bsonType?: BsonTypeName | BsonTypeName[]
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

export function reflectBsonType(type: any): BsonTypeName | null {
  return Object.keys(BSON_TYPES).reduce((acc, key) => (
    acc || BSON_TYPES[key as BsonTypeName] !== type ? acc : key as BsonTypeName
  ), null as BsonTypeName | null)
}
