import { BsonValue } from './bson'

export type MethodArgs =  [] | [BsonValue] | [BsonValue, BsonValue] | [BsonValue, BsonValue, BsonValue] | [BsonValue, BsonValue, BsonValue, BsonValue]

export interface MethodOpts {
  name?: string
  argTypes?: MethodArgs
  returnType?: BsonValue
  extras?: Record<string, unknown>
}

export class MethodMeta {
  readonly name: string
  readonly argTypes: MethodArgs
  readonly returnType: BsonValue
  readonly extras: Record<string, unknown>

  constructor(proto: Record<string, Function>, key: string, opts = {} as MethodOpts) {
    const method = proto[key] as Function
    this.name = opts.name || proto[key].name || key
    this.argTypes = opts.argTypes || Reflect.getMetadata('design:paramtypes', proto, key)
    this.returnType = opts.returnType || Reflect.getMetadata('design:returntype', proto, key)
    this.extras = opts.extras || {}
    console.log(method, this)
  }
}
