import { JSONSchema4 } from 'json-schema'

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

// TODO - fix declaration issue
export const BsonSchema = {}

export default BsonSchema
