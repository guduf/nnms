
import Ajv from 'ajv'
import applyBsonTypes from 'ajv-bsontype'
import { readFileSync } from 'fs'
import { join } from 'path'
import { JSONSchema7 } from 'json-schema'

import {BsonSchema , BsonTypeName } from './bson'

export type ValidatorError = Ajv.ErrorObject
export type ValidateFunction = (data: any) => ValidatorError[] | null

const AJV_OPTIONS: Ajv.Options = {}

const BSON_SCHEMA_REF = 'bson-schema'

export type SchemaRef = BsonSchema

export class Validator {
  private static _ajv: Ajv.Ajv

  private static _init(): Ajv.Ajv {
    const ajv = new Ajv(AJV_OPTIONS)
    applyBsonTypes(ajv)
    let bsonMetaSchema = {} as JSONSchema7
    try {
      const metaSchemaPath = join(__dirname, '../assets/bson-schema.json')
      bsonMetaSchema = JSON.parse(readFileSync(metaSchemaPath, {encoding: 'utf8'}))
    } catch (err) {
      console.error(`cannot retrieve bson meta schema: ${err.message}`)
    }
    ajv.addMetaSchema(bsonMetaSchema, BSON_SCHEMA_REF)
    return ajv
  }

  static addSchema(id: string, schema: SchemaRef): void {
    if (!this._ajv) this._ajv = this._init()
    if (!schema.bsonType && schema.type) {
      schema = {...schema, bsonType: schema.type as BsonTypeName}
      delete schema.type
    }
    const errors = Validator.validateSchema(schema)
    if (errors) {
      console.error(errors)
      throw new TypeError('invalid schema')
    }
    this._ajv.addSchema(schema, id)
  }

  static compile(schema: BsonSchema): ValidateFunction {
    if (!this._ajv) this._ajv = this._init()
    const validator = this._ajv.compile(schema)
    return data => {
      const valid = validator(data)
      return valid ? null : (validator.errors as ValidatorError[])
    }
  }

  static validate(schemaKeyRef: object | string, data: any): ValidatorError[] | null {
    if (!this._ajv) this._ajv = this._init()
    this._ajv.validate(schemaKeyRef, data) as boolean
    return this._ajv.errors || null
  }

  static validateSchema(data: any): ValidatorError[] | null {
    return this.validate(BSON_SCHEMA_REF, data)
  }
}
