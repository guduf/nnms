import { fork } from 'child_process'
import { join } from 'path'
import { map, catchError, share, mergeMap } from 'rxjs/operators'
import { fromEvent, Observable, EMPTY, Subscription, of, merge } from 'rxjs'

import { Crash, Event, Log } from 'nnms'

import { Config } from './config'

export type ForkedEvent = ['CRASH', Crash] | ['LOG', Log]

export class ForkedProcess {
  constructor(
    private readonly _cfg: Config,
    paths: string[],
  ) {
    const forkedEvents = this._fork(paths).pipe(share())
    this.crash = forkedEvents.pipe(mergeMap(e => e[0] === 'CRASH' ? of(e[1]) : EMPTY),share())
    this.logs = forkedEvents.pipe(mergeMap(e => e[0] === 'LOG' ? of(e[1]) : EMPTY), share())
    this._subscr = merge(forkedEvents, this.crash, this.logs).subscribe()
  }

  private readonly _subscr: Subscription

  readonly crash: Observable<Crash>
  readonly logs: Observable<Log>

  private _fork(paths: string[]): Observable<ForkedEvent> {
    return new Observable(observer => {
      console.log(`🚀  fork process with modules in ${paths.map(k => `'${k}'`).join(' ')} on dir '${this._cfg.root}'`)
      const runner = fork(
        join(__dirname, '../assets/forked_process.js'),
        paths,
        {cwd: this._cfg.root}
      )
      const subscr = fromEvent<[{ type: Buffer, data: any }]>(runner, 'message').pipe(
        map(([{data}]) => {
          const e = Event.deserialize(Buffer.from(data))
          switch (e.type) {
            case 'CRASH': return ['CRASH', Crash.fromEvent(e)] as ForkedEvent
            case 'LOG': return ['LOG', Log.fromEvent(e)] as ForkedEvent
            default: throw new Error(`unknown type '${e.type}'`)
          }
        }),
        catchError(err => {
          console.error('❗️ cannot deserialize event: ', err.message)
          return EMPTY
        })
      ).subscribe(observer)

      return () => {
        runner.kill('SIGINT')
        subscr.unsubscribe()
      }
    })
  }

  interrupt() { this._subscr.unsubscribe() }
}
