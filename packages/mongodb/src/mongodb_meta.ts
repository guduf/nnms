import { BsonType } from './mongodb_schema'

export const PROPS_META_KEY = 'nnms:mongodb:props'

export interface MongoDbPropMeta {
  bsonType: BsonType
  required: boolean
  unique: boolean
}

export const SCHEMA_METADATA_KEY = 'nnms:mongodb:schema'

export interface MongoDbSchemaMeta {
  name: string
  props: Record<string, MongoDbPropMeta>
}

