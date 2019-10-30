import { BsonSchema, BsonTypeName, BSON_TYPES } from './bson'
import Ajv from 'ajv'

export const SCHEMA_METADATA_KEY = 'nnms:schema'

export function reflectSchema(type: Function): BsonSchema {
  const schema = Reflect.getMetadata(SCHEMA_METADATA_KEY, type) as BsonSchema
  if (!schema) throw new Error('cannot retrieve schema metadata')
  return schema
}

export type SchemaInput = BsonTypeName | Function | BsonSchema | [BsonTypeName] | [Function] | [BsonSchema]

const AJV_OPTIONS: Ajv.Options = {}

const BSON_SCHEMA_METASCHEMA = {
  $id: '#bsonSchema',
  allOf: [
    {$ref: 'http://json-schema.org/draft-04/schema'},
    {properties: {bsonType: {type: 'string', enum: [Object.keys(BSON_TYPES)]}}}
  ]
}

export class SchemaValidator {
  private static _ajv: Ajv.Ajv

  static validate(schemaKeyRef: object | string, data: any): Ajv.ErrorObject[] | null {
    if (this._ajv) {
      this._ajv = new Ajv(AJV_OPTIONS)
      this._ajv.addSchema(BSON_SCHEMA_METASCHEMA, 'bsonSchema')
    }
    this._ajv.validate(schemaKeyRef, data) as boolean
    return this._ajv.errors || null
  }

  static validateSchema(data: any): Ajv.ErrorObject[] | null {
    return this.validate(BSON_SCHEMA_METASCHEMA.$id, data)
  }

  static buildBsonSchema(schema: SchemaInput): BsonSchema {
    if (Array.isArray(schema)) {
      if (schema.length !== 1) throw new Error('type tupple must has exactly one item')
      return {bsonType: 'array', items: this.buildBsonSchema(schema[0]) as BsonSchema}
    }
    if (typeof schema === 'function') return reflectSchema(schema)
    if (typeof schema === 'string') {
      if (Object.keys(BSON_TYPES).includes(schema)) throw new Error('invaliid bson type')
      return {bsonType: schema}
    }
    const errors = this._ajv.validate(BSON_SCHEMA_METASCHEMA.$id, schema)
    if (errors) {
      console.error(errors)
      throw new Error('cannot build bson schema')
    }
    return schema
  }
}

export function SchemaProp(
  input: SchemaInput | boolean = false,
  schemaOrRequired: BsonSchema | boolean = false,
  required = false
): PropertyDecorator {
  required = (
    typeof input === 'boolean' ? input :
      typeof schemaOrRequired === 'boolean' ? schemaOrRequired :
        required
  )
  throw new Error('not implement')
}
