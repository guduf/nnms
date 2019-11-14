import { fork } from 'child_process'
import { join } from 'path'
import { map, catchError, share, mergeMap } from 'rxjs/operators'
import { fromEvent, Observable, EMPTY, Subscription, of, merge } from 'rxjs'

import { Crash, Event, Log, TopicEvent } from 'nnms'

import { Config } from './config'

export class ForkedProcess {
  constructor(
    private readonly _cfg: Config,
    paths: string[],
  ) {
    const {outputs} = this._fork(paths)
    this.crash = outputs.pipe(mergeMap(e => e.type === 'CRASH' ? of(Crash.fromEvent(e)) : EMPTY), share())
    this.logs = outputs.pipe(mergeMap(e => e.type === 'LOG' ? of(Log.fromEvent(e)) : EMPTY), share())
    outputs.pipe(mergeMap(e => e.type === 'TOPIC' ? of(TopicEvent.fromEvent(e)) : EMPTY), share()).subscribe(console.log)
    this._subscr = merge(outputs, this.crash, this.logs).subscribe()
  }

  private readonly _subscr: Subscription

  readonly crash: Observable<Crash>
  readonly logs: Observable<Log>

  private _fork(paths: string[]): { nextInput: (e: Event) => void, outputs: Observable<Event> } {
    console.log(`🚀  fork process with modules in ${paths.map(k => `'${k}'`).join(' ')} on dir '${this._cfg.root}'`)
    const runner = fork(
      join(__dirname, '../assets/process.js'),
      paths,
      {cwd: this._cfg.root}
    )
    const nextInput = (e: Event) => runner.send(e.serialize())
    const outputs = new Observable<Event>(observer => {
      const subscr = fromEvent<[{ data: ArrayBuffer }]>(runner, 'message').pipe(
        map(([{data}]) => Event.deserialize(Buffer.from(data))),
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
    return {nextInput, outputs}
  }

  interrupt() { this._subscr.unsubscribe() }
}
