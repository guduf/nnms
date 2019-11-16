import { fork } from 'child_process'
import { join } from 'path'
import { map, catchError, share, mergeMap } from 'rxjs/operators'
import { fromEvent, Observable, EMPTY, Subscription, of, merge, OperatorFunction } from 'rxjs'

import { Crash, Event, Log, TopicEvent, BsonValue } from 'nnms'

import { Config } from './config'

export interface TopicBridge {
  observe: (sub: string, queue: string | null) => Observable<BsonValue>
  publish: (sub: string, value: BsonValue) => void
}

export class ForkedProcess {
  constructor(
    private readonly _cfg: Config,
    paths: string[],
    topicBridge?: TopicBridge
  ) {
    const {outputs, nextInput} = this._fork(paths)
    this.crash = outputs.pipe(
      mergeMap(e => e.type === 'CRASH' ? of(Crash.fromEvent(e)) : EMPTY), share()
    )
    this.logs = outputs.pipe(
      mergeMap(e => e.type === 'LOG' ? of(Log.fromEvent(e)) : EMPTY), share()
    )
    const topicEvents = outputs.pipe(
      mergeMap(e => e.type === 'TOPIC' ? of(TopicEvent.fromEvent(e)) : EMPTY), share()
    )
    const topicOutputs = topicEvents.pipe(
      mergeMap(e => e.signal === 'OUT' ? of({sub: e.sub, value: e.getValue()}) : EMPTY)
    )
    const topicInputSignals = topicEvents.pipe(
      mergeMap(e => ['ON', 'OFF'].includes(e.signal) ? of(e) : EMPTY),
      this._handleTopicInputEvent(nextInput)
    )
    this._subscr = merge(outputs, topicInputSignals, this.crash, this.logs).subscribe()
    this._topicBridge = topicBridge || {
      observe: (sub => topicOutputs.pipe(
        mergeMap(e => e.sub === sub ? of(e.value) : EMPTY)
      )),
      publish: () => { }
    }
  }

  private readonly _subscr: Subscription
  private readonly _topicBridge: TopicBridge
  private readonly _topicInputs = {} as Record<string, Subscription>

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

  _handleTopicInputEvent(nextInput: (e: Event) => void): OperatorFunction<TopicEvent, never> {
    return obs => obs.pipe(mergeMap(e => {
      const key = [e.sub, e.queue].join('|')
      if (e.signal === 'OFF') {
        if (!this._topicInputs[key]) return EMPTY
        this._topicInputs[key].unsubscribe()
        delete this._topicInputs[key]
        return EMPTY
      }
      if (this._topicInputs[key]) return EMPTY
      this._topicInputs[key] = this._topicBridge.observe(e.sub, e.queue).subscribe(
        data => {
          const topicEvent = TopicEvent.create({
            signal: 'IN',
            sub: e.sub,
            data,
            ...(e.queue ? {queue: e.queue}: {})
          })
          nextInput(topicEvent.toEvent())
        },
        err => console.error('topic bridge error', err)
      )
      return EMPTY
    }))
  }

  interrupt() { this._subscr.unsubscribe() }
}
