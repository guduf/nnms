import { MongoError } from 'mongodb'

import { ModuleContext, Module, Log, Topic } from 'nnms'
import { Collection, Database } from 'nnms-common'
import { LogSocket } from 'nnms-process'

import { LogRecord } from './schemas/log_record'
import { LogMetricMutation } from './schemas/log_metric_mutation'

const LOG_REMOTE_VARS = {
  URL: 'ws://localhost:6390'
}

@Module('logWriter', LOG_REMOTE_VARS, Database)
export class LogWriter {
  constructor(
    private readonly _ctx: ModuleContext<typeof LOG_REMOTE_VARS>,
    @Collection(LogRecord)
    private readonly _logs: Collection<LogRecord>,
    @Collection(LogMetricMutation)
    private readonly _logMetricMutations: Collection<LogMetricMutation>,
    @Topic(LogRecord)
    private readonly _logTopic: Topic<LogRecord>
  ) {
    this.connect(this._ctx.vars.URL)
  }

  connect(url: string): void {
    const logSocket = LogSocket(url)
    logSocket.subscribe(
      (log: Log) => {
        if (log.level !== 'DBG') this._handleLog(log)
        if (log.metrics) this._handleMetricMutations(log as Log & { metrics: Record<string, LogMetricMutation> })
      },
      err => this._ctx.logger.error('CONNECT_LOG_SERVER', err)
    )
  }

  private async _handleLog(log: Log): Promise<void> {
    const record = log.toRecord() as LogRecord
    try { await this._logs.insert(record) } catch (err) {
      if (err instanceof MongoError && err.code === 11000) {
        this._ctx.logger.warn('INSERT_LOG', {
          message: 'duplicate entry',
          id: log.id.toHexString()
        })
        return
      }
      this._ctx.crash(err)
    }
    try { this._logTopic.publish(record) } catch (err) {
      this._ctx.logger.warn('PUBLISH_LOG', {id: log.id.toHexString()})
      return
    }
    this._ctx.logger.info('HANDLE_LOG', {id: log.id.toHexString()})
  }

  private async _handleMetricMutations(
    {id, metrics, tags}: Log & { metrics: Record<string, LogMetricMutation> }
  ): Promise<void> {
    const mutations: LogMetricMutation[] = Object.keys(metrics).map(name => ({
      logId: id,
      name,
      tags,
      ...metrics[name]
    }))
    try { await this._logMetricMutations.insert(...mutations) } catch (err) {
      this._ctx.logger.error('INSERT_MUTATION', err)
      this._ctx.crash(err)
    }
    this._ctx.logger.info('HANDLE_MUTATION', {
      logId: id.toHexString(),
      names: Object.keys(metrics)
    })
  }
}
