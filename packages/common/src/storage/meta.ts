import 'reflect-metadata'

import { IndexSpecification } from 'mongodb'

import { BsonType } from 'nnms'

export const PROPS_META_KEY = 'nnms:storage:props'

export interface DocPropMeta {
  bsonType: BsonType
  required: boolean
  unique: boolean
}

export const DOC_METADATA_KEY = 'nnms:storage:doc'

export interface DocOpts {
  name: string
  indexes?: IndexSpecification[]
}

export class DocMeta {
  name: string
  indexes: IndexSpecification[] | null

  constructor(opts: DocOpts) {
    this.name = opts.name
    if (!opts.name) throw new Error('missing name')
    this.indexes = opts.indexes || null
  }
}

export function reflectDocMeta(target: Function): DocMeta | null {
  const meta = Reflect.getMetadata(DOC_METADATA_KEY, target)
  if (!meta) return null
  if (!(meta instanceof DocMeta)) throw new Error('invalid doc meta')
  return meta
}

export function Doc({name, indexes}: DocOpts): ClassDecorator {
  return target => {
    const meta = new DocMeta({name, indexes})
    Reflect.defineMetadata(DOC_METADATA_KEY, meta, target)
  }
}
