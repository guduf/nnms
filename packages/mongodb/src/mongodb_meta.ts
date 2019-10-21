import BsonSchema, { BsonType } from './mongodb_schema'

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

export function buildBsonSchema(meta: MongoDbSchemaMeta): Partial<BsonSchema> {
  const {props, required} = Object.keys(meta.props).reduce((acc, key) => {
    const prop = {...meta.props[key]}
    delete prop.required
    delete prop.unique
    return {
      props: {...acc.props, [key]: prop},
      required: [...acc.required, ...(meta.props[key].required ? [key] : [])],
      unique: [...acc.unique, ...(meta.props[key].unique ? [key] : [])]
    }
  }, {props: {} as BsonSchema['properties'], required: [] as string[], unique: [] as string[]})
  return {bsonType: 'object', ...(required.length ? {required} : {}), properties: props}
}

export function reflectMongoDbSchema(type: any): Partial<BsonSchema> {
  const meta = Reflect.getMetadata(SCHEMA_METADATA_KEY, type) as MongoDbSchemaMeta
  if (!meta) throw new Error('cannot retrieve schema metadata')
  return buildBsonSchema(meta)
}
