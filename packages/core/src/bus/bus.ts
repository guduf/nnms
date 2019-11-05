import { share, mergeMap, catchError } from 'rxjs/operators'
import { Observable, EMPTY, of, OperatorFunction, InteropObservable } from 'rxjs'

import { Event } from '../event'
import { Logger } from '../log'
import { BsonValue, BsonSchema, Validator } from '../schema'
import { BusTopicEvent } from './topic_event'

export interface AbstractTopic<T = BsonValue> extends InteropObservable<T> {
  publish: (value: T) => void
  pipe: Observable<T>['pipe']
  subscribe: Observable<T>['subscribe']
}

export class Bus {
  constructor(
    logger: Logger,
    inputs: Observable<Event>,
    private readonly _output: (e: Event) => void
  ) {
    this._logger = logger.extend({src: 'bus'})
    this._topics = {}
    this._inputs = inputs.pipe(this._mapInputEvents())
  }

  private readonly _logger: Logger
  private readonly _inputs: Observable<{ sub: string, value: BsonValue }>
  private readonly _topics: Record<string, Observable<BsonValue>>

  buildTopic(id: string, schema: BsonSchema): AbstractTopic {
    const inputs = this.getTopicListener(id)
    const validator = Validator.compile(schema)
    return {
      pipe: inputs.pipe.bind(inputs),
      subscribe: inputs.subscribe.bind(inputs),
      publish: this.getTopicPublisher(id, validator),
      [Symbol.observable]: () => inputs
    }
  }

  getTopicPublisher(sub: string, schema: BsonSchema): (data: BsonValue) => void {
    const validator = Validator.compile(schema)
    return data => {
      try {
        const errors = validator(data)
        if (errors) throw new Error('validation failed')
        this._output(BusTopicEvent.create(sub, 'OUT', data).toEvent())
      } catch(err) {
        this._logger.warn('PUBLISH_SUB_VAL', err)
      }
    }
  }

  getTopicListener(sub: string): Observable<BsonValue> {
    if (this._topics[sub]) return this._topics[sub]
    return this._topics[sub] = new Observable<BsonValue>(observer => {
      this._output(BusTopicEvent.create(sub, 'ON').toEvent())
      const subscr = this._inputs.pipe(
        mergeMap(e => e.sub === sub ? of(e.value) : EMPTY)
      ).subscribe(observer)
      return () => {
        this._output(BusTopicEvent.create(sub, 'OFF').toEvent())
        subscr.unsubscribe()
        delete this._topics[sub]
      }
    }).pipe(share())
  }

  private _mapInputEvents(): OperatorFunction<Event, { sub: string, value: BsonValue }> {
    return inputs => inputs.pipe(
      mergeMap(e => {
        if (e.type !== 'TOPIC') return EMPTY
        const topicEvent = BusTopicEvent.fromEvent(e)
        if (topicEvent.signal !== 'IN') return EMPTY
        return of({sub: topicEvent.sub, value: topicEvent.getValue()})
      }),
      catchError(err => {
        this._logger.warn('MAP_INPUT_EVENT', {
          message: err.message
        })
        return EMPTY
      }),
    )
  }
}
