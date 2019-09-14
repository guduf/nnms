import { JSONSchema4 } from 'json-schema'

export type BsonType = (
  'double' |
  'string' |
  'object' |
  'array' |
  'binData' |
  'objectId' |
  'bool' |
  'date' |
  'null' |
  'regex' |
  'javascript' |
  'javascriptWithScope' |
  'int' |
  'timestamp' |
  'long' |
  'decimal' |
  'minKey' |
  'maxKey'
)

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

export interface MongoDbSchema extends BsonSchema {
  bsonType: 'object'
  name: string
}

// TODO - delete
export const MongoDbSchema = Symbol()

export default MongoDbSchema
