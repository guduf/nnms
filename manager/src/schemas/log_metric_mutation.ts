import { Doc } from 'nnms-common'
import nnms, { ObjectId, Prop, LOG_METRIC_MUTATION_SCHEMA, LogMetricMutation as ILogMetricMutation, LogMetricValue } from 'nnms'

const {tags} = nnms.LOG_RECORD_SCHEMA.properties

@Doc({
  ...(LOG_METRIC_MUTATION_SCHEMA as any),
  indexes: [
    {key: {logId: 1, name: 1, tags: 1}, unique: true}
  ]
})
export class LogMetricMutation implements ILogMetricMutation {
  @Prop(true)
  logId: ObjectId

  @Prop(true)
  name: string

  @Prop(tags, true)
  tags: nnms.LogTags

  index?: string
  insert?: LogMetricValue[]
  patch?: Partial<LogMetricValue>[]
  remove?: string[]
  upsert?: LogMetricValue[]
}
