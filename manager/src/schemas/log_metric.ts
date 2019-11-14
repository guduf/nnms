import { Doc } from 'nnms-common'
import nnms, { Prop, LogMetricValue, LOG_METRIC_VALUE_SCHEMA } from 'nnms'

const {tags} = nnms.LOG_RECORD_SCHEMA.properties

@Doc({
  indexes: [{key: {name: 1, tags: 1}, unique: true}]
})
export class LogMetric {
  @Prop(true)
  name: string

  @Prop(tags, true)
  tags: nnms.LogTags

  @Prop([LOG_METRIC_VALUE_SCHEMA])
  values: LogMetricValue[]

  @Prop()
  updatedAt: Date
}
