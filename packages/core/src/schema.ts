import camelCase from 'camelcase'

import { BsonSchema, BsonTypeName, BSON_TYPES } from './bson'
import { Validator } from './validator'

export const SCHEMA_METADATA_KEY = 'nnms:schema'

export type SchemaInput = BsonTypeName | Function | BsonSchema | [BsonTypeName] | [Function] | [BsonSchema]

export function buildSchema(schema: SchemaInput, skipValidate = false): BsonSchema {
  if (Array.isArray(schema)) {
    if (schema.length !== 1) throw new Error('type tupple must has exactly one item')
    return {bsonType: 'array', items: buildSchema(schema[0])}
  }
  if (typeof schema === 'function') {
    const reflected = reflectSchema(schema)
    if (!reflected) throw new Error('cannot reflect schema')
    return reflected.schema
  }
  if (typeof schema === 'string') {
    if (Object.keys(BSON_TYPES).includes(schema)) throw new Error('invaliid bson type')
    return {bsonType: schema}
  }
  const errors = skipValidate ? null : Validator.validateSchema(schema)
  if (errors) {
    console.error(errors)
    throw new Error('cannot build bson schema')
  }
  return schema
}

export interface SchemaPropOpts {
  name: string
  required: boolean
  schema: SchemaInput
}

export function Prop(name?: string): PropertyDecorator
export function Prop(required: true): PropertyDecorator
export function Prop(name?: string, required?: true): PropertyDecorator
export function Prop(input: SchemaInput, required?: true): PropertyDecorator
export function Prop(name: string, input: SchemaInput, required?: true): PropertyDecorator
export function Prop(
  arg1?: string | true | SchemaInput,
  arg2?: true | SchemaInput,
  arg3 = false
): PropertyDecorator {
  return (proto, propKey) => {
    if (typeof propKey !== 'string') throw new Error('propKey must be a string')
    const name = typeof arg1 === 'string' ? arg1 : propKey
    const schema = typeof arg1 === 'object' ? arg1 : typeof arg2 === 'object' ? arg2 : {}
    const required = typeof arg1 === 'boolean' ? arg1 : typeof arg2 === 'boolean' ? arg2 : arg3
    const propOpts: SchemaPropOpts = {name, schema, required}
    Reflect.defineMetadata(proto, propOpts, propKey, `${SCHEMA_METADATA_KEY}:prop:${propKey}`)
  }
}

export function decorateSchema(target: Function | Symbol, schema: BsonSchema & { id: string }): void {
  Validator.addSchema(schema)
  Reflect.defineMetadata(SCHEMA_METADATA_KEY, {$ref: schema.id.slice(1)}, target)
}

export function reflectSchema(target: Function | Symbol): BsonSchema | null {
  return (Reflect.getMetadata(SCHEMA_METADATA_KEY, target) || null) as BsonSchema | null
}

export function Schema(schema: BsonSchema & { id: string, type?: 'object' }): ClassDecorator {
  return target => {
    const propsOpts = Reflect.getMetadataKeys(target.prototype).reduce((acc, key) => {
      if (typeof key !== 'string') return acc
      const splited = key.split(':')
      if (splited.slice(0, -1).join(':') !== `${SCHEMA_METADATA_KEY}:prop`) return acc
      const opts = Reflect.getMetadata(target.prototype, key) as SchemaPropOpts
      return {...acc, [opts.name]: opts}
    }, {} as Record<string, SchemaPropOpts>)
    const {required, properties} = Object.keys(propsOpts).reduce((acc, key) => {
      const propOpts = propsOpts[key] as SchemaPropOpts
      if (acc.properties[key]) throw new TypeError(`property '${key}' is already setted`)
      const properties = {...acc.properties, [key]: buildSchema(propOpts.schema, true)}
      const required = [
        ...acc.required,
        ...(propOpts.required && !acc.required.includes(key) ? [key] : [])
      ]
      return {required, properties}
    }, {required: schema.required || [], properties: schema.properties || {}})
    decorateSchema(target, {
      id: `/${camelCase(target.name)}`,
      ...schema,
      bsonType: 'object' as const,
      required,
      properties
    })
  }
}
