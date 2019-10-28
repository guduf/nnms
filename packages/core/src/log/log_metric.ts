/** Represents a metric value */
export type LogMetricValue = Record<string, boolean | null | number | string>

/** Represents a metric mutation */
export interface LogMetricMutation<
  T extends LogMetricValue = LogMetricValue,
  K extends keyof T = keyof T
> {
  index?: K
  insert?: T[]
  patch?: Partial<T>[]
  remove?: string[]
  upsert?: T[]
}

export const LOG_METRIC_VALUE_SCHEMA = {
  type: 'object',
  additionalProperties: {type: ['boolean', 'null', 'number', 'string']},
  minProperties: 1
} as const

export const LOG_METRIC_MUTATION_SCHEMA = {
  type: 'object',
  properties: {
    index: {type: 'string'},
    insert: {type: 'array', items: LOG_METRIC_VALUE_SCHEMA, minItems: 1},
    patch: {type: 'array', items: LOG_METRIC_VALUE_SCHEMA, minItems: 1},
    upsert: {type: 'array', items: LOG_METRIC_VALUE_SCHEMA, minItems: 1},
    remove: {type: 'array', items: {type: 'string'}, minItems: 1}
  },
  minProperties: 1
} as const

export function applyMetricMutation(
  metrics: LogMetricValue[],
  mutation: LogMetricMutation
): LogMetricValue[] {
  const {remove, insert, upsert, patch} = mutation
  const index = mutation.index || 'id'
  metrics = (metrics || []) as LogMetricValue[]
  if (remove) metrics = metrics.filter(data => !remove.includes(data[index] as string))
  if (insert) metrics = [...metrics, ...insert]
  if (upsert) metrics = (
    upsert.reduce((acc, upsertMetric) => {
      const id = upsertMetric[index || 'id']
      const existingData = acc.find(data => (
        data[index] === id
      ))
      const i = acc.indexOf(existingData || {})
      if (i >= 0) return [
        ...metrics.slice(0, i),
        {...metrics[i], ...upsertMetric},
        ...metrics.slice(i + 1)
      ]
      return [...metrics, upsertMetric]
    }, metrics)
  )
  if (patch) metrics = (
    patch.reduce((acc, upsertMetric) => {
      const id = upsertMetric[index]
      const existingData = acc.find(data => (
        data[index] === id
      ))
      const i = acc.indexOf(existingData || {})
      if (i < 0) return metrics
      return [
        ...metrics.slice(0, i),
        {...metrics[i], ...(upsertMetric as LogMetricValue)},
        ...metrics.slice(i + 1)
      ]
    }, metrics)
  )
  return metrics
}

