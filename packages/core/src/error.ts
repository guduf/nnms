import { serializeError, deserializeError, ErrorObject } from 'serialize-error'
import { Event } from './event'
import { ObjectId } from 'bson'
import { JsonObject } from 'type-fest'

export interface ErrorValue {
  e: ErrorObject
}

export class Crash {
  static create(catched: Error): Crash {
    return new Crash(new ObjectId(), {e: serializeError(catched)})
  }

  static fromEvent(e: Event): Crash {
    return new Crash(e.id, JSON.parse(e.data.toString()))
  }

  static serialize(catched: Error): Buffer {
    return Crash.create(catched).toEvent().serialize()
  }

  private constructor(
    readonly id: ObjectId,
    private readonly _value: ErrorValue
  ) { }

  get error(): Error {
    return deserializeError(this._value.e)
  }

  get timestamp(): Date {
    return this.id.getTimestamp()
  }

  toEvent(): Event {
    return Event.create({
      type: 'CRA',
      id: this.id,
      data: JSON.stringify(this._value)
    })
  }

  toJson(): JsonObject {
    return this._value.e
  }
}
