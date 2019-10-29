import { serializeError, deserializeError, ErrorObject } from 'serialize-error'
import { Event } from './event'
import { ObjectId } from './bson'
import { JsonObject } from 'type-fest'
import { LogTags } from './log'

export interface ErrorValue {
  e: ErrorObject
  t: LogTags
}

export class Crash {
  static create(
    catched: Error,
    tags: LogTags
  ): Crash {
    return new Crash(new ObjectId(), {e: serializeError(catched), t: tags})
  }

  static fromEvent(e: Event): Crash {
    return new Crash(e.id, JSON.parse(e.data.toString()))
  }

  static serialize(catched: Error, tags: LogTags): Buffer {
    return Crash.create(catched, tags).serialize()
  }

  private constructor(
    readonly id: ObjectId,
    private readonly _value: ErrorValue
  ) { }

  get code(): string | null { return this._value.e.code || null }

  get error(): Error { return deserializeError(this._value.e) }

  get name(): string | null { return this._value.e.name || null }

  get message(): string {
    return this._value.e.message || this._value.e.name || this._value.e.code || 'no error message'
  }

  get tags(): LogTags { return this._value.t }

  get timestamp(): Date { return this.id.getTimestamp() }

  get stack(): string | null { return this._value.e.stack || null }

  serialize(): Buffer { return this.toEvent().serialize() }

  toEvent(): Event {
    return Event.create({
      type: 'CRASH',
      id: this.id,
      data: JSON.stringify(this._value)
    })
  }

  toJson(): JsonObject {
    return this._value.e
  }
}
