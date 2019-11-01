import { Doc } from 'nnms-common'
import nnms, { ObjectId, Prop } from 'nnms'

const {tags} = nnms.LOG_RECORD_SCHEMA.properties

export interface LogMetricMutation extends nnms.LogMetricMutation {
  id: ObjectId
}

const MUTATION_SCHEMA = {
  ...nnms.LOG_METRIC_MUTATION_SCHEMA,
  required: ['id'],
  properties: {
    ...nnms.LOG_METRIC_MUTATION_SCHEMA.properties,
    id: {bsonType: 'objectId'}
  },
  minProperties: 2
}

@Doc({
  indexes: [
    {key: {name: 1, 'mutations.id': 1}, unique: true},
    {key: {name: 1, tags: 1}, unique: true}
  ]
})
export class LogMetric {
  @Prop(true)
  name: string

  @Prop([nnms.LOG_METRIC_VALUE_SCHEMA], true)
  values: nnms.LogMetricValue[]

  @Prop([MUTATION_SCHEMA], true)
  mutations: LogMetricMutation[]

  @Prop(tags, true)
  tags: nnms.LogTags
}
