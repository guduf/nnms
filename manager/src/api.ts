import { Observable, from } from 'rxjs'
import { merge, share, mergeMap } from 'rxjs/operators'

import { Module, Topic } from 'nnms'
import { Collection, WebSocketPlugin, WebSocketMethod } from 'nnms-common'

import { LogRecord } from './schemas/log_record'

export const API_VARS = {
  WS_PORT: '9063'
}

@Module('api', API_VARS, WebSocketPlugin)
export class Api {
  private readonly _logStream: Observable<LogRecord>

  constructor(
    @Collection(LogRecord)
    private readonly _logs: Collection<LogRecord>,
    @Topic(LogRecord)
    logTopic: Topic<LogRecord>
  ) {
    this._logStream = logTopic.pipe(share())
    this._logStream.subscribe()
  }

  @WebSocketMethod({path: 'logs', returnType: LogRecord})
  getLogs(): Observable<LogRecord> {
    return from(this._logs.find({})).pipe(
      mergeMap(logs => from(logs)),
      merge(this._logStream)
    )
  }
}
