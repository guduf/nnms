import { ObjectId } from 'bson'

import { Prop } from 'nnms'
import { Doc } from 'nnms-common'
import {LogMetricValue, LogTags, LOG_METRIC_VALUE_SCHEMA, LOG_METRIC_MUTATION_SCHEMA, LOG_RECORD_SCHEMA, LogMetricMutation as ILogMetricMutation } from 'nnms'

const {tags} = LOG_RECORD_SCHEMA.properties

export interface LogMetricMutation extends ILogMetricMutation {
  id: ObjectId
}

const MUTATION_SCHEMA = {
  ...LOG_METRIC_MUTATION_SCHEMA,
  required: ['id'],
  properties: {
    ...LOG_METRIC_MUTATION_SCHEMA.properties,
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

  @Prop([LOG_METRIC_VALUE_SCHEMA], true)
  values: LogMetricValue[]

  @Prop([MUTATION_SCHEMA], true)
  mutations: LogMetricMutation[]

  @Prop(tags, true)
  tags: LogTags
}
