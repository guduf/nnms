import { JsonObject, JsonValue } from "type-fest";

export type LoggerMetricValue = JsonObject[]

export interface LoggerMetricMap { [key: string]: LoggerMetricValue }

export interface LoggerEventMetricMutation<T extends LoggerMetricValue = LoggerMetricValue> {
  $metricKey?: string
  $insert?: string | T
  $upsert?: string | T
  $remove?: string | string[]
  $patch?: string | (T extends Array<infer X> ? Partial<X>[] : never)
}

export interface LoggerEventMetricMutations {
  [metricName: string]: LoggerEventMetricMutation
}

const mutationArrayKeywordRegExp = /^\[\$data(\.\w+)*\]$/

export function getMetricData<T extends Array<string | JsonObject>>(
  mutation: string | T,
  data?: JsonObject
): T | undefined {
  if (typeof mutation === 'string' && mutationArrayKeywordRegExp.test(String(mutation))) {
    return [getMetricData(mutation.slice(1, -1), data)] as unknown as T | undefined
  }
  if (typeof mutation === 'string' && mutation.startsWith('$data')) {
    const mutaData = mutation.split('.').reduce((acc, frag, i) => {
      if (!i) return acc
      try {
        return (acc as JsonObject)[frag] as JsonValue | undefined
      } catch (err) {
        return undefined
      }
    }, data as JsonValue | undefined)
    return Array.isArray(mutaData) ? mutaData as T : undefined
  }
  if (!Array.isArray(mutation)) return undefined
  return mutation as T
}

export function applyMetricMutation(
  metric: LoggerMetricValue,
  mutation: LoggerEventMetricMutation,
  data?: JsonObject
): LoggerMetricValue {
  const {$remove, $insert, $upsert, $patch} = mutation
  const $metricKey = mutation.$metricKey || 'id'
  metric = (metric || []) as JsonObject[]
  if ($remove) {
    const mutData = getMetricData($remove, data)
    if (mutData) metric = metric.filter(data => !(mutData).includes(data[$metricKey] as string))
  }
  if ($insert) {
    const mutData = getMetricData($insert, data)
    if (mutData) metric = [...metric, ...mutData]
  }
  if ($upsert) {
    const mutData = getMetricData($upsert, data)
    if (mutData) metric = (
      mutData.reduce((acc, upsertMetric) => {
        const id = upsertMetric[$metricKey || 'id']
        const existingData = acc.find(data => (
          data[$metricKey] === id
        ))
        const i = acc.indexOf(existingData || {})
        if (i >= 0) return [
          ...metric.slice(0, i),
          {...metric[i], ...upsertMetric},
          ...metric.slice(i + 1)
        ]
        return [...metric, upsertMetric]
      }, metric)
    )
  }
  if ($patch) {
    const mutData = getMetricData($patch as JsonObject[], data)
    if (mutData) metric = (
      mutData.reduce((acc, upsertMetric) => {
        const id = upsertMetric[$metricKey || 'id']
        const existingData = acc.find(data => (
          data[$metricKey] === id
        ))
        const i = acc.indexOf(existingData || {})
        if (i < 0) return metric
        return [
          ...metric.slice(0, i),
          {...metric[i], ...upsertMetric},
          ...metric.slice(i + 1)
        ]
      }, metric)
    )
  }
  return metric
}
