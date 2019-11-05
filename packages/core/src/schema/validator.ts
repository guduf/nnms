
import Ajv from 'ajv'
import applyBsonTypes from 'ajv-bsontype'

import BsonSchema, { BSON_TYPES, BsonTypeName } from './bson'

export type ValidatorError = Ajv.ErrorObject
export type ValidateFunction = (data: any) => ValidatorError[] | null

const AJV_OPTIONS: Ajv.Options = {}

const BSON_SCHEMA_METASCHEMA = {
  $id: '#bsonSchema',
  allOf: [
    {$ref: 'http://json-schema.org/draft-04/schema'},
    {properties: {bsonType: {type: 'string', enum: [Object.keys(BSON_TYPES)]}}}
  ]
}

const SCHEMA_ID_REGEX = /^\/[a-z][a-zA-Z0-9]{1,63}$/

export type SchemaRef = BsonSchema & { id: string }

export class Validator {
  private static _ajv: Ajv.Ajv

  private static _init(): void {
    this._ajv = new Ajv(AJV_OPTIONS)
    applyBsonTypes(this._ajv)
    this._ajv.addSchema(BSON_SCHEMA_METASCHEMA, 'bsonSchema')
  }

  static addSchema(schema: SchemaRef) {
    if (!this._ajv) this._init()
    if (!SCHEMA_ID_REGEX.test(schema.id)) throw new Error(`invalschema.id id '${schema.id}'`)
    if (!schema.bsonType && schema.type) {
      schema = {...schema, bsonType: schema.type as BsonTypeName}
      delete schema.type
    }
    delete schema.schema.type
    const errors = Validator.validateSchema(schema)
    if (errors) {
      console.error(errors)
      throw new TypeError('invalid schema')
    }
    this._ajv.addSchema(schema)
  }

  static compile(schema: BsonSchema): ValidateFunction {
    if (!this._ajv) this._init()
    const validator = this._ajv.compile(schema)
    return data => {
      const valid = validator(data)
      return valid ? null : (validator.errors as ValidatorError[])
    }
  }

  static validate(schemaKeyRef: object | string, data: any): ValidatorError[] | null {
    if (!this._ajv) this._init()
    this._ajv.validate(schemaKeyRef, data) as boolean
    return this._ajv.errors || null
  }

  static validateSchema(data: any): ValidatorError[] | null {
    return this.validate(BSON_SCHEMA_METASCHEMA.$id, data)
  }
}
