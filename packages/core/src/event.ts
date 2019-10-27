import { Binary, deserialize, serialize, ObjectId } from 'bson'

const EVENT_DATA_MAX_SIZE = 10e6

export const EVENT_TYPE_PATTERN = /^[A-Z]{3,6}$/

export type EventValue = Readonly<{
  e: string
  i: ObjectId
  d: Binary
  t: number
}>

export interface EventInput {
  type: string
  id?: ObjectId
  data?: string | Buffer
  timestamp?: Date
}

export class Event {
  static create(input: EventInput): Event {
    const date = input.timestamp || new Date()
    const data = (
      Buffer.isBuffer(input.data) ?
        input.data :
        Buffer.from(input.data && typeof input.data === 'string' ? input.data : '')
    )
    return new Event({
      i: input.id || new ObjectId(),
      e: input.type,
      d: new Binary(data),
      t: date.getMilliseconds()
    })
  }

  static serialize(
    type: EventInput['type'],
    data?: EventInput['data'],
    timestamp?: EventInput['timestamp'],
    id?: EventInput['id']
  ): Buffer {
    return Event.create({type, data, id, timestamp}).serialize()
  }

  static deserialize(buffer: Buffer): Event { return new Event(deserialize(buffer)) }

  static fromValue(value: EventValue): Event { return new Event(value) }

  private constructor(
    private readonly _value: EventValue
  ) {
    if (!(_value.i instanceof ObjectId)) throw new TypeError('id not matching ObjectId')
    if (!EVENT_TYPE_PATTERN.test(_value.e)) throw new TypeError('type not matching EVENT_TYPE_PATTERN')
    if (!(_value.d instanceof Binary)) throw new TypeError('data not instance of Binary')
    if (_value.d.length() > EVENT_DATA_MAX_SIZE) throw new TypeError('data exceeds EVENT_DATA_MAX_SIZE')
    if (!(_value.t >= 0 && _value.t < 1000)) throw new TypeError('time is not between 0 and 1000 excluded')
    if (_value.d.length() > EVENT_DATA_MAX_SIZE) throw new TypeError('data exceeds EVENT_DATA_MAX_SIZE')
  }

  get id(): ObjectId { return this._value.i }
  get type(): string { return this._value.e }
  get data(): Binary { return this._value.d }
  get timestamp(): Date { return new Date(this._value.i.getTimestamp().getTime() + this._value.t) }

  serialize(): Buffer { return serialize(this._value) }
}
