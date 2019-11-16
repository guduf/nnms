import { Event } from '../event'
import { BsonValue, deserialize, serialize } from '../schema'

export const BUS_TOPIC_SIGNALS = ['OFF', 'ON', 'IN', 'OUT'] as const

export type TopicSignal = typeof BUS_TOPIC_SIGNALS[number]

export interface TopicEventValue {
  u: string
  s: number
  q?: string
  d?: BsonValue
}

export interface TopicEventInput {
  sub: string
  signal: TopicSignal
  queue?: string
  data?: BsonValue
}

export class TopicEvent {
  static create(input: TopicEventInput): TopicEvent {
    return new TopicEvent({
      u: input.sub,
      s: BUS_TOPIC_SIGNALS.indexOf(input.signal),
      q: input.queue,
      d: input.data
    })
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

  get queue(): string | null { return this._value.q || null }

  // TODO - throw error on 'ON' 'OFF' signal
  getValue(): BsonValue {
    return this._value.d as BsonValue
  }

  toEvent(): Event {
    const data = serialize(this._value)
    return Event.create({type: 'TOPIC', data})
  }
}
