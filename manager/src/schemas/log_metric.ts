import { ObjectId } from 'bson'

import { DocSchema, DocProp } from 'nnms-common'
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

@DocSchema('logMetrics', {
  indexes: [
    {key: {name: 1, 'mutations.id': 1}, unique: true},
    {key: {name: 1, tags: 1}, unique: true}
  ]
})
export class LogMetric {
  @DocProp(true)
  name: string

  // TODO - remove any assertion
  @DocProp([LOG_METRIC_VALUE_SCHEMA], true)
  values: LogMetricValue[]

  // TODO - remove any assertion
  @DocProp({bsonType: 'array', items: MUTATION_SCHEMA as any}, true)
  mutations: LogMetricMutation[]  // TODO - remove any assertion

  // TODO - remove any assertion
  @DocProp(tags as any, true)
  tags: LogTags
}
