import { ModuleContext, Module, Topic, LogMetricValue, applyMetricMutation } from 'nnms'
import { Collection, Database } from 'nnms-common'

import { LogMetricMutation } from './schemas/log_metric_mutation'
import { LogMetric } from './schemas/log_metric'


@Module('logMetricWriter', {}, Database)
export class LogMetricWriter {
  constructor(
    private readonly _ctx: ModuleContext,
    @Collection(LogMetric)
    private readonly _logMetrics: Collection<LogMetric>,
    @Collection(LogMetricMutation)
    private readonly _logMetricMutations: Collection<LogMetricMutation>,
    @Topic(LogMetric)
    private readonly _logMetricTopic: Topic<LogMetric>,
    @Topic(LogMetricMutation, {queue: true})
    logMetricMutationTopic: Topic<LogMetricMutation>
  ) {
    logMetricMutationTopic.subscribe(e => this._handleMetricMutation(e))
  }

  private async _handleMetricMutation(mutation: LogMetricMutation): Promise<void> {
    const {name, tags} = mutation
    const mutations = await this._logMetricMutations.find({name, tags})
    let values: LogMetricValue[]
    try {
      values = mutations.reduce((acc, mutation) => (
        applyMetricMutation(acc, mutation)
      ), [] as LogMetricValue[])
    } catch (err) {
      return this._ctx.logger.error('APPLY_METRIC_MUTATIONS', {name, tags, message: err.message})
    }
    const metric = {name, tags, values, updatedAt: new Date()}
    try {
      this._logMetrics.upsert({name, tags}, metric)
    } catch (err) {
      return this._ctx.logger.error('UPSERT_METRIC', {name, tags, message: err.message})
    }
    try {
      this._logMetricTopic.publish(metric)
    } catch (err) {
      this._ctx.logger.error('PUBLISH_MUTATION', err)
    }
    this._ctx.logger.info('HANDLE_METRIC_MUTATIONS', {name, tags})
  }
}
