import { Provider, ProviderContext, ApplicationContext, deserialize, BsonValue, Event, serialize } from 'nnms'
import { BusSubject } from './subject'
import { share, mergeMap, single } from 'rxjs/operators'
import { Observable, EMPTY, of } from 'rxjs'

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

  getSubject(id: string): BusSubject {
    return (
      this._subjects[id] ? this._subjects[id] : this._subjects[id] = this._createSubject(id)
    )
  }

  private _createSubject(id: string): BusSubject {
    const inputs = this._subjectEvents.pipe(
      mergeMap(({i, v}) => i === id ? of(v) : EMPTY)
    )
    return {
      pipe: inputs.pipe.bind(inputs),
      subscribe: inputs.subscribe.bind(inputs),
      complete: () => {
        console.error('not implemented')
      },
      next: (value: BsonValue) => this._publishSubjectValue(id, value),
      [Symbol.observable]: () => inputs
    }
  }

  private _publishSubjectSignal(id: string, signal: 'start' | 'end'): void {
    try {
      const output = Event.create({type: 'BUSSIG', data: serialize({i: id, s: signal[0]})})
      this._appCtx.nextOutput(output)
    } catch(err) {
      this._ctx.logger.warn('PUBLISH_SUB_VAL', err)
    }
  }

  private _publishSubjectValue(id: string, value: BsonValue): void {
    try {
      const output = Event.create({type: 'BUSNEX', data: serialize({i: id, v: value})})
      this._appCtx.nextOutput(output)
    } catch(err) {
      this._ctx.logger.warn('PUBLISH_SUB_VAL', err)
    }
  }
}
