import { share, mergeMap } from 'rxjs/operators'
import { Observable, EMPTY, of } from 'rxjs'

import { Provider, ProviderContext, ApplicationContext, deserialize, BsonValue, Event, serialize, BsonSchema, Validator } from 'nnms'

import { BusSubject } from './subject'

Provider('eventbus', {})
export class Eventbus {
  private _subjects: Record<string, BusSubject>
  private _subjectEvents: Observable<{ i: string, v: BsonValue }>

  constructor(
    private readonly _ctx: ProviderContext,
    private readonly _appCtx: ApplicationContext
  ) {
    this._subjectEvents = this._appCtx.inputs.pipe(mergeMap(e => {
      if (e.type !== 'BUSSUB') return EMPTY
      try {
        const data = deserialize(e.data.buffer) as { i: string, v: BsonValue }
        if (!data.i.startsWith('/')) throw new Error(`invalid data['i']`)
        if (typeof data.v == 'undefined') throw new Error(`invalid data['v']`)
        return of(data)
      } catch (err) {
        this._ctx.logger.warn('INVALID_BUSSUB', {
          message: err.message,
          eventId: e.id.toHexString()
        })
        return EMPTY
      }
    }), share())
  }

  getSubject(id: string, schema: BsonSchema): BusSubject {
    return (
      this._subjects[id] ? this._subjects[id] : this._subjects[id] = this._buildSubject(id, schema)
    )
  }

  private _buildSubject(id: string, schema: BsonSchema): BusSubject {
    const inputs = this._buildSubjectListener(id)
    const validator = Validator.compile(schema)
    return {
      pipe: inputs.pipe.bind(inputs),
      subscribe: inputs.subscribe.bind(inputs),
      complete: () => {
        console.error('not implemented')
      },
      next: this._buildSubjectPublisher(id, validator),
      [Symbol.observable]: () => inputs
    }
  }

  private _publishSubjectSignal(id: string, signal: 'subscr' | 'unsubscr'): void {
    try {
      const output = Event.create({type: 'BUSSIG', data: serialize({i: id, s: signal[1]})})
      this._appCtx.nextOutput(output)
    } catch(err) {
      this._ctx.logger.warn('PUBLISH_SUB_VAL', err)
    }
  }

  private _buildSubjectPublisher(id: string, schema: BsonSchema): (value: BsonValue) => void {
    const validator = Validator.compile(schema)
    return value => {
      try {
        const errors = validator(value)
        if (errors) throw new Error('validation failed')
        const output = Event.create({type: 'BUSNEX', data: serialize({i: id, v: value})})
        this._appCtx.nextOutput(output)
      } catch(err) {
        this._ctx.logger.warn('PUBLISH_SUB_VAL', err)
      }
    }
  }

  private _buildSubjectListener(id: string): Observable<BsonValue> {
    return new Observable<BsonValue>(observer => {
      this._publishSubjectSignal(id, 'subscr')
      const subscr = this._subjectEvents.pipe(
        mergeMap(({i, v}) => i === id ? of(v) : EMPTY)
      ).subscribe(observer)
      return () => {
        this._publishSubjectSignal(id, 'unsubscr')
        subscr.unsubscribe()
        delete this._subjects[id]
      }
    }).pipe(share())
  }
}
