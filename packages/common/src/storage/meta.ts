import 'reflect-metadata'

import { IndexSpecification } from 'mongodb'
import pluralize from 'pluralize'

import { Schema, defineClassMeta, SchemaRef, getClassMeta } from 'nnms'

export const DOC_METADATA_KEY = 'doc'

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
  const meta = getClassMeta(target, DOC_METADATA_KEY)
  if (!meta) return null
  if (!(meta instanceof DocMeta)) throw new Error('invalid doc meta')
  return meta
}

export const Doc = defineClassMeta<[(Partial<DocOpts & SchemaRef>) | undefined]>(
  (target, opts = {}) => {
    const schema = {...opts} as SchemaRef
    delete schema.collName
    delete schema.indexes
    Schema(schema)(target)
    const collName = opts.collName || pluralize(schema.id.slice(1))
    const meta = new DocMeta(target, {collName, indexes: opts.indexes})
    return {[DOC_METADATA_KEY]: meta}
  }
)
