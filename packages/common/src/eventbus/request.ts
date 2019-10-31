// export type BusRequestArgs =  [] | [BsonValue] | [BsonValue, BsonValue] | [BsonValue, BsonValue, BsonValue] | [BsonValue, BsonValue, BsonValue, BsonValue]

// export interface BusRequestValue<T extends BusRequestArgs = []> {
//   n: string
//   m: string
//   a: T
//   e: { t: 'mod' | 'prov' | 'plug' , i: ObjectId }
// }

// export interface BusRequestInput {

// }

// export class BusRequest<T extends BusRequestArgs = []> {
//   static create<T extends BusRequestArgs = []>(
//     input: { moduleType: Function, method: string, args: T }
//   ): BusRequest<T> {
//     const modMeta = getResourceMeta('module', input.moduleType)

//   }

//   private constructor(
//     private readonly _value: BusRequestValue
//   ) { }
// }
