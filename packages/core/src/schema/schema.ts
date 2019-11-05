import camelCase from 'camelcase'

import { BsonSchema, BsonTypeName, BSON_TYPES } from './bson'
import { definePropMeta, getPropsMeta, getClassMeta, defineClassMeta } from '../di'
import { SchemaRef, Validator } from './validator'

export const SCHEMA_METADATA_KEY = 'schema'

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
    if (Object.keys(BSON_TYPES).includes(schema)) throw new Error('invalid bson type')
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


export interface PropDecorator {
    (name?: string): PropertyDecorator
    (required: true): PropertyDecorator
    (name?: string, required?: true): PropertyDecorator
    (input: SchemaInput, required?: true): PropertyDecorator
    (name: string, input: SchemaInput, required?: true): PropertyDecorator
}

type PropDecoratorOpts = Partial<[string | true | SchemaInput, true | SchemaInput, boolean]>

export const Prop = definePropMeta<PropDecoratorOpts>((_, key, arg1, arg2, arg3) => {
  const name = typeof arg1 === 'string' ? arg1 : key
  const schema = typeof arg1 === 'object' ? arg1 : typeof arg2 === 'object' ? arg2 : {}
  const required = typeof arg1 === 'boolean' ? arg1 : typeof arg2 === 'boolean' ? arg2 : arg3 || false
  return {[SCHEMA_METADATA_KEY]: {name, schema, required}}
}) as PropDecorator

export function reflectSchema(target: Function | Symbol): SchemaRef | null {
  return getClassMeta(target, 'schema')
}

export type ObjectRefSchema = Partial<SchemaRef> & { bsonType?: 'object', type?: 'object' }

export function buildObjectSchema(target: Function, schema: ObjectRefSchema): SchemaRef {
  const propsOpts = getPropsMeta<SchemaPropOpts>(target.prototype, 'schema')
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
  return {
    ...schema,
    id: schema.id || `/${camelCase(target.name)}`,
    bsonType: 'object' as const,
    required,
    properties
  }
}

export const Schema = defineClassMeta<[SchemaRef]>((_, schema) => {
  Validator.addSchema(schema)
  return {[SCHEMA_METADATA_KEY]: {$ref: schema.id.slice(1)}}
})
