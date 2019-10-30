import { Observable } from 'rxjs'

import { BsonSchema, reflectBsonType } from '../bson'
import { SchemaInput, Validator, reflectSchema } from '../schema'

export type MethodArgInputs = [] | [SchemaInput] | [SchemaInput, SchemaInput] | [SchemaInput, SchemaInput, SchemaInput] | [SchemaInput, SchemaInput, SchemaInput, SchemaInput]
export type MethodArgs = [] | [BsonSchema] | [BsonSchema, BsonSchema] | [BsonSchema, BsonSchema, BsonSchema] | [BsonSchema, BsonSchema, BsonSchema, BsonSchema]

export const METHOD_KINDS = {
  void: [undefined],
  single: [Promise, Observable],
  flow: [Observable]
} as const

export type MethodKind = keyof (typeof METHOD_KINDS)

export type MethodReturn<TKind extends MethodKind = 'void'> = TKind extends 'void' ? never : BsonSchema

export interface MethodOpts<TReturnKind extends MethodKind = 'void'> {
  returnKind?: TReturnKind
  returnType?: TReturnKind extends 'void' ? never : SchemaInput
  argTypes?: MethodArgInputs
  name?: string
  extras?: Record<string, unknown>
}

export class MethodMeta<TReturnKind extends MethodKind = 'void'> {
  static buildKind(reflectedReturn: unknown, opt?: MethodKind): MethodKind {
    if (!opt) {
      const found = Object.keys(METHOD_KINDS).reduce((acc, kind) => (
        acc || !(METHOD_KINDS as any)[kind][0] !== reflectedReturn ? acc : kind as MethodKind
      ), null as MethodKind | null)
      if (!found) throw new TypeError('cannot reflect method kind')
      return found
    }
    if (!METHOD_KINDS[opt]) throw new TypeError('invalid method kind')
    if (!(METHOD_KINDS as any)[opt].includes(reflectedReturn)) throw new TypeError('invalid method kind')
    return opt
  }

  static buildArgSchemas(reflectedArgs: unknown[], opt?: MethodArgInputs): MethodArgs {
    if (!opt) {
      return reflectedArgs.map(arg => {
        const bsonType = reflectBsonType(arg)
        if (bsonType) return {bsonType}
        const reflected = typeof arg === 'function' ? reflectSchema(arg) : null
        if (!reflected) throw new Error('cannot reflect bson type or schema from arg')
        return reflected.schema
      }) as MethodArgs
    }
    if (opt.length !== reflectedArgs.length) throw new Error('argument length mismatch')
    return (opt as SchemaInput[]).map(input => Validator.buildSchema(input)) as MethodArgs
  }

  readonly name: string
  readonly argSchemas: MethodArgs
  readonly kind: MethodKind
  readonly returnSchema: TReturnKind extends 'void' ? never : BsonSchema
  readonly extras: Record<string, unknown>
  readonly func: Function

  constructor(
    proto: Record<string, Function>,
    key: string,
    opts = {} as MethodOpts<TReturnKind>
  ) {
    const reflected  = {
      argTypes: Reflect.getMetadata('design:paramtypes', proto, key),
      returnType: Reflect.getMetadata('design:returntype', proto, key)
    }
    this.kind = MethodMeta.buildKind(reflected.returnType, opts.returnKind)
    this.func = proto[key]
    this.name = opts.name || proto[key].name || key
    this.argSchemas = MethodMeta.buildArgSchemas(opts.argTypes || [])
    if (this.kind !== 'void') {
      this.returnSchema = (
        Validator.buildSchema(opts.returnType || {})
      ) as TReturnKind extends 'void' ? never : BsonSchema
    }
    this.extras = opts.extras || {}
    console.log(this)
  }
}
