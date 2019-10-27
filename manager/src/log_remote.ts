import { ModuleContext, ModuleRef, Log } from 'nnms'
import { Collection, Database } from 'nnms-common'
import { LogSocket } from 'nnms-process'

import { LogRecord } from './schemas/log_record'

const LOG_REMOTE_VARS = {
  URL: 'ws://localhost:6390'
}

@ModuleRef('log-remote', LOG_REMOTE_VARS, Database)
export class LogRemote {

  constructor(
    private readonly _ctx: ModuleContext<typeof LOG_REMOTE_VARS>,
    @Collection(LogRecord)
    private readonly _logs: Collection<LogRecord>
  ) {
    this.connect(this._ctx.vars.URL)
  }

  connect(url: string): void {
    const logSocket = LogSocket(url)
    logSocket.subscribe(async (log: Log) => {
      if (log.level !== 'DBG') {
        await this._logs.insert(log.toRecord() as LogRecord)
        this._ctx.logger.info('INSERT_LOG', {id: log.id.toHexString()})
      }
    })
  }
}
