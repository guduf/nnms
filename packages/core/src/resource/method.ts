import { Observable } from 'rxjs'

import { BsonSchema, reflectBsonType, SchemaInput, reflectSchema, buildSchema } from '../schema'
import { definePropMeta, reflectMethodTypes, getPropsMeta } from '../di'

export type MethodArgInputs = [] | [SchemaInput] | [SchemaInput, SchemaInput] | [SchemaInput, SchemaInput, SchemaInput] | [SchemaInput, SchemaInput, SchemaInput, SchemaInput]
export type MethodArgs = [] | [BsonSchema] | [BsonSchema, BsonSchema] | [BsonSchema, BsonSchema, BsonSchema] | [BsonSchema, BsonSchema, BsonSchema, BsonSchema]

export const METHOD_METAKEY = 'method'

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
    return (opt as SchemaInput[]).map(input => buildSchema(input)) as MethodArgs
  }

  readonly name: string
  readonly argSchemas: MethodArgs
  readonly kind: MethodKind
  readonly returnSchema: TReturnKind extends 'void' ? never : BsonSchema
  readonly func: Function

  constructor(
    proto: Record<string, Function>,
    key: string,
    opts = {} as MethodOpts<TReturnKind>
  ) {
    const reflected  = reflectMethodTypes(proto, key)
    this.kind = MethodMeta.buildKind(reflected.returnType, opts.returnKind)
    this.func = proto[key]
    this.name = opts.name || proto[key].name || key
    this.argSchemas = MethodMeta.buildArgSchemas(opts.argTypes || [])
    if (this.kind !== 'void') {
      this.returnSchema = (
        buildSchema(opts.returnType || {})
      ) as TReturnKind extends 'void' ? never : BsonSchema
    }
  }
}

export const Method = (
  definePropMeta((proto, key, opts) => ({[METHOD_METAKEY]: new MethodMeta(proto, key, opts)}))
) as <TReturnKind extends MethodKind>(opts: MethodOpts<TReturnKind>) => MethodDecorator

export function reflectMethod(proto: Record<string, Function>, key: string): MethodMeta {
  return getPropsMeta<MethodMeta>(proto, METHOD_METAKEY)[key]
}
