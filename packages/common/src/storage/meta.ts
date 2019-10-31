import 'reflect-metadata'

import { IndexSpecification } from 'mongodb'

import { BsonType, decorateObjectSchema, ObjectRefSchema } from 'nnms'
import pluralize from 'pluralize'

export const PROPS_META_KEY = 'nnms:storage:props'

export interface DocPropMeta {
  bsonType: BsonType
  required: boolean
  unique: boolean
}

export const DOC_METADATA_KEY = 'nnms:storage:doc'

export interface DocOpts {
  collName: string
  indexes?: IndexSpecification[]
}

export class DocMeta {
  collName: string
  indexes: IndexSpecification[] | null

  constructor(
    readonly target: Function,
    opts: DocOpts
  ) {
    this.collName = opts.collName
    if (!opts.collName) throw new Error('missing collName')
    this.indexes = opts.indexes || null
  }
}

export function reflectDocMeta(target: Function): DocMeta | null {
  const meta = Reflect.getMetadata(DOC_METADATA_KEY, target)
  if (!meta) return null
  if (!(meta instanceof DocMeta)) throw new Error('invalid doc meta')
  return meta
}

export function Doc(opts: Partial<DocOpts> & ObjectRefSchema = {}): ClassDecorator {
  return target => {
    const schema = {...opts}
    delete schema.collName
    delete schema.indexes
    const schemaRef = decorateObjectSchema(target, schema)
    const collName = opts.collName || pluralize(schemaRef.id.slice(1))
    const meta = new DocMeta(target, {collName, indexes: opts.indexes})
    Reflect.defineMetadata(DOC_METADATA_KEY, meta, target)
  }
}
