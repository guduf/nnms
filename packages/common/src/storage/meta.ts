import BsonSchema, { BsonType, BSON_TYPES, reflectBsonType } from './bson'

import 'reflect-metadata'
import { JSONSchema4TypeName } from 'json-schema'
import { IndexSpecification } from 'mongodb'

export const PROPS_META_KEY = 'nnms:storage:props'

export interface DocPropMeta {
  bsonType: BsonType
  required: boolean
  unique: boolean
}

export const DOC_METADATA_KEY = 'nnms:storage:doc'

export interface DocSchemaMeta {
  name: string
  props: Record<string, DocPropMeta>
  indexes?: IndexSpecification[]
}

export function buildBsonSchema(meta: DocSchemaMeta): Partial<BsonSchema> {
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

export function reflectDocSchema(type: any): Partial<BsonSchema> {
  const meta = Reflect.getMetadata(DOC_METADATA_KEY, type) as DocSchemaMeta
  if (!meta) throw new Error('cannot retrieve schema metadata')
  return buildBsonSchema(meta)
}

export interface DocOptions {
  indexes?: DocSchemaMeta['indexes']
}

export function DocSchema(name: string, {indexes}: DocOptions = {}): ClassDecorator {
  return target => {
    const props = (
      Reflect.getMetadata(PROPS_META_KEY, target.prototype) as Record<string, DocPropMeta> || {}
    )
    const meta = {name, indexes, props}
    Reflect.defineMetadata(DOC_METADATA_KEY, meta, target)
  }
}

export interface DocPropOpts {
  type?: JSONSchema4TypeName
  bsonType?: BsonType
  required?: boolean
  items?: BsonSchema
  properties?: BsonSchema['properties']
  unique?: boolean
  enum?: any[]
  pattern?: string
}

export function getPropBsonType(
  type: BsonType | Function | DocPropOpts | [BsonType] | [Function] | [DocPropOpts]
): Partial<DocPropOpts> {
  if (Array.isArray(type)) {
    if (type.length !== 1) throw new Error('type tupple must has exactly one item')
    return {bsonType: 'array', items: getPropBsonType(type[0]) as BsonSchema}
  }
  if (typeof type === 'function') return reflectDocSchema(type) as Partial<DocPropOpts>
  if (typeof type === 'string') {
    if (!BSON_TYPES.includes(type)) throw new Error('invalid bson type')
    return {bsonType: type}
  }
  return type
}

export function DocProp(
  typeOrRequiredOrOpts: BsonType | Function | DocPropOpts | [BsonType] | [Function] | [DocPropOpts] | boolean = {},
  optsOrRequired: DocPropOpts | boolean = {}
): PropertyDecorator {
  const [a1, a2] = [typeOrRequiredOrOpts, optsOrRequired]
  return (target, propKey) => {
    const type = typeof a1 === 'boolean' ? null : getPropBsonType(a1)
    const meta = {
      ...(type ? type : typeof a1 === 'object' ? a1 : typeof a1 === 'boolean' ? {required: a1} : {}),
      ...(typeof a2 === 'object' ? a2 : typeof a2 === 'boolean' ? {required: a2} : {})
    } as Partial<DocPropOpts>
    if (typeof propKey === 'symbol') return
    const bsonType = meta.bsonType || meta.type || reflectBsonType(target, propKey)
    delete meta.type
    if (!bsonType) throw new Error(
      `invalid bson type for property '${propKey}' of class ${target}`
    )
    const props = (
      Reflect.getMetadata(PROPS_META_KEY, target) || {}
    ) as Record<string, DocPropMeta>
    Reflect.defineMetadata(PROPS_META_KEY, {...props, [propKey]: {bsonType, ...meta}}, target)
  }
}
