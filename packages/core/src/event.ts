import { ObjectID, Binary, deserialize, serialize } from 'bson'

const EVENT_DATA_MAX_SIZE = 10e6

export const EVENT_TYPE_PATTERN = /^[A-Z]{3}$/

export type EventValue = Readonly<{
  e: string
  i: ObjectID
  d: Binary
}>

export class Event {
  static create(type: string, data: Buffer): Event {
    return new Event({i: ObjectID.createFromTime(Date.now() / 1e3), e: type, d: new Binary(data)})
  }

  static deserialize(buffer: Buffer): Event { return new Event(deserialize(buffer)) }

  constructor(value: EventValue) {
    if (!(value.i instanceof ObjectID)) throw new TypeError('id not matching ObjectID')
    if (!EVENT_TYPE_PATTERN.test(value.e)) throw new TypeError('type not matching EVENT_TYPE_PATTERN')
    if (!(value.d instanceof Binary)) throw new TypeError('data not instance of Binary')
    if (value.d.length() > EVENT_DATA_MAX_SIZE) throw new TypeError('data exceeds EVENT_DATA_MAX_SIZE')
    this._value = {e: value.e, i: value.i, d: value.d}
  }

  private readonly _value: EventValue

  get id(): ObjectID { return this._value.i }
  get type(): string { return this._value.e }
  get data(): Binary { return this._value.d }

  serialize(): Buffer { return serialize(this._value) }
}
