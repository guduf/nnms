import { Observable, Subject } from 'rxjs'
import { shareReplay } from 'rxjs/operators'
import Transport from 'winston-transport'

import { LoggerEvent } from 'nnms'

export class SubjectTransport extends Transport {
  readonly events: Observable<LoggerEvent>

  private readonly _eventSubject = new Subject<LoggerEvent>()

  constructor (
    transportOpts: Transport.TransportStreamOptions = {}
  ) {
    super(transportOpts)
    this.events = this._eventSubject.pipe(shareReplay())
    this.events.subscribe()
  }

  log(e: LoggerEvent, callback: () => void): void {
    this._eventSubject.next(e)
    callback()
  }

}

export default SubjectTransport
