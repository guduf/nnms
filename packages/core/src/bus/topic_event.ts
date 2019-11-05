import { Event } from '../event'
import { BsonValue, deserialize, serialize } from '../schema'

export const BUS_TOPIC_SIGNALS = ['OFF', 'ON', 'IN', 'OUT'] as const

export type BusTopicSignal = typeof BUS_TOPIC_SIGNALS[number]

export interface BusTopicEventValue {
  u: string
  s: number
  d?: BsonValue
}

export class BusTopicEvent {
  static create(sub: string, signal: BusTopicSignal, data?: BsonValue): BusTopicEvent {
    return new BusTopicEvent({u: sub, s: BUS_TOPIC_SIGNALS.indexOf(signal), d: data})
  }

  static fromEvent(e: Event): BusTopicEvent {
    if (e.type !== 'TOPIC') throw new Error('invalid event type')
    return new BusTopicEvent(deserialize(e.data.buffer))
  }

  private constructor(
    private readonly _value: BusTopicEventValue
  ) { }

  get sub(): string { return this._value.u }

  get signal(): BusTopicSignal { return BUS_TOPIC_SIGNALS[this._value.s] }

  getValue(): BsonValue {
    if (['IN', 'OUT'].includes(this.signal)) {
      throw new Error('cannot get value of event with signal different than IN or OUT')
    }
    return this._value.d as BsonValue
  }

  toEvent(): Event {
    const data = serialize(this._value)
    return Event.create({type: 'TOPIC', data})
  }
}
