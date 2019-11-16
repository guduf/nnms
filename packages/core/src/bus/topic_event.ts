import { Event } from '../event'
import { BsonValue, deserialize, serialize } from '../schema'

export const BUS_TOPIC_SIGNALS = ['OFF', 'ON', 'IN', 'OUT'] as const

export type TopicSignal = typeof BUS_TOPIC_SIGNALS[number]

export interface TopicEventValue {
  u: string
  s: number
  d?: BsonValue
}

export class TopicEvent {
  static create(sub: string, signal: TopicSignal, data?: BsonValue): TopicEvent {
    return new TopicEvent({u: sub, s: BUS_TOPIC_SIGNALS.indexOf(signal), d: data})
  }

  static fromEvent(e: Event): TopicEvent {
    if (e.type !== 'TOPIC') throw new Error('invalid event type')
    return new TopicEvent(deserialize(e.data.buffer))
  }

  private constructor(
    private readonly _value: TopicEventValue
  ) { }

  get sub(): string { return this._value.u }

  get signal(): TopicSignal { return BUS_TOPIC_SIGNALS[this._value.s] }

  getValue(): BsonValue { return this._value.d as BsonValue }

  toEvent(): Event {
    const data = serialize(this._value)
    return Event.create({type: 'TOPIC', data})
  }
}
