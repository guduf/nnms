import { MongoError } from 'mongodb'

import { ModuleContext, Module, Log, LogMetricMutation, applyMetricMutation, Topic } from 'nnms'
import { Collection, Database } from 'nnms-common'
import { LogSocket } from 'nnms-process'

import { LogRecord } from './schemas/log_record'
import { LogMetric } from './schemas/log_metric'

const LOG_REMOTE_VARS = {
  URL: 'ws://localhost:6390'
}

@Module('logWriter', LOG_REMOTE_VARS, Database)
export class LogWriter {
  constructor(
    private readonly _ctx: ModuleContext<typeof LOG_REMOTE_VARS>,
    @Collection(LogRecord)
    private readonly _logs: Collection<LogRecord>,
    @Collection(LogMetric)
    private readonly _logMetrics: Collection<LogMetric>,
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
        if (log.metrics) this._handleMetrics(log as Log & { metrics: Record<string, LogMetricMutation> })
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

  private async _handleMetrics(
    {id, metrics, tags}: Log & { metrics: Record<string, LogMetricMutation> }
  ) {
    for (const name in metrics) {
      const mutations = metrics[name]
      // TODO - add projection
      const [previous] = await this._logMetrics.find({name, tags})
      const values = applyMetricMutation(previous ? previous.values : [], mutations)
      try {
        if (!previous) {
          await this._logMetrics.insert({
            name,
            values,
            tags,
            mutations: [{id, ...mutations}]
          })
        } else {
          const duplicate = previous.mutations.find(mut => mut.id.equals(id))
          if (duplicate) {
            this._ctx.logger.warn('INSERT_METRIC', {
              message: 'duplicate entry',
              id: id.toHexString(),
              name
            })
            return
          }
          await this._logMetrics.update({name, tags}, {
            $set: {values: values},
            $push: {mutations: {id, ...mutations}}
          })
          this._ctx.logger.info('UPSERT_METRIC', {name, id: id.toHexString()})
        }
      } catch (err) {
        this._ctx.crash(err)
      }
    }
  }
}
