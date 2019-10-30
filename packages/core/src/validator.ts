import Ajv from 'ajv'
import applyBsonTypes from 'ajv-bsontype'
import { BSON_TYPES } from './bson'

const AJV_OPTIONS: Ajv.Options = {}

const BSON_SCHEMA_METASCHEMA = {
  $id: '#bsonSchema',
  allOf: [
    {$ref: 'http://json-schema.org/draft-04/schema'},
    {properties: {bsonType: {type: 'string', enum: [Object.keys(BSON_TYPES)]}}}
  ]
}

export class Validator {
  private static _ajv: Ajv.Ajv

  static validate(schemaKeyRef: object | string, data: any): Ajv.ErrorObject[] | null {
    if (this._ajv) {
      this._ajv = new Ajv(AJV_OPTIONS)
      applyBsonTypes(this._ajv)
      this._ajv.addSchema(BSON_SCHEMA_METASCHEMA, 'bsonSchema')
    }
    this._ajv.validate(schemaKeyRef, data) as boolean
    return this._ajv.errors || null
  }

  static validateSchema(data: any): Ajv.ErrorObject[] | null {
    return this.validate(BSON_SCHEMA_METASCHEMA.$id, data)
  }
}
