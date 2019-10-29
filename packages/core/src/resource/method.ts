import { Observable } from 'rxjs'

import { BsonSchema } from '../bson'

export type MethodArgs = [] | [BsonSchema] | [BsonSchema, BsonSchema] | [BsonSchema, BsonSchema, BsonSchema] | [BsonSchema, BsonSchema, BsonSchema, BsonSchema]

export const METHOD_RETURN_KINDS = {
  void: undefined,
  single: Promise,
  flow: Observable
} as const

export type MethodReturnKindName = keyof (typeof METHOD_RETURN_KINDS)

export type MethodReturnKind = (typeof METHOD_RETURN_KINDS)[MethodReturnKindName]

export type MethodReturn<TKind extends MethodReturnKindName = 'void'> = TKind extends 'void' ? never : BsonSchema

export interface MethodOpts<
  TArgs extends MethodArgs = [],
  TReturnKind extends MethodReturnKindName = 'void'
> {
  returnKind?: TReturnKind
  returnType?: BsonSchema
  argTypes?: TArgs
  name?: string
  extras?: Record<string, unknown>
}

export class MethodMeta<
  TArgs extends MethodArgs = [],
  TReturnKind extends MethodReturnKindName = 'void'
> {
  readonly name: string
  readonly argTypes: TArgs
  readonly returnKind: MethodReturnKindName
  readonly returnType: TReturnKind extends 'void' ? never : BsonSchema
  readonly extras: Record<string, unknown>
  readonly func: Function

  constructor(
    proto: Record<string, Function>,
    key: string,
    opts = {} as MethodOpts<TArgs, TReturnKind>
  ) {
    const returnKindType = Reflect.getMetadata('design:returntype', proto, key)
    if (returnKindType === Promise) this.returnKind = 'single'
    if (returnKindType === Observable) this.returnKind = 'flow'
    else throw new TypeError('method should return promise or observable of bson value')
    this.func = proto[key]
    this.name = opts.name || proto[key].name || key
    this.argTypes = opts.argTypes || Reflect.getMetadata('design:paramtypes', proto, key)
    this.returnKind = opts.returnKind || 'void'
    this.returnType = (
      ('void' ? undefined : {bsonType: 'object'}) as TReturnKind extends 'void' ? never : BsonSchema
    )
    this.extras = opts.extras || {}
    console.log(this)
  }
}
