import { distinctUntilChanged, filter, scan, shareReplay, startWith } from 'rxjs/operators'
import { OperatorFunction } from 'rxjs'
import { JsonObject } from 'type-fest'

import { applyMetricMutation, LogMetricMutation, LogMetricValue, LOG_METRIC_MUTATION_SCHEMA } from './log_metric'
import { Event } from '../event'
import { JSONSchema4 } from 'json-schema'
import Ajv from 'ajv'

export const LOG_LEVELS = ['DBG', 'ERR', 'INF', 'WAR'] as const

export type LogLevel = typeof LOG_LEVELS[number]

export const LOG_LEVEL_PROPS: { [level in LogLevel]: { color: string} } = {
  DBG: {color: 'white'},
  ERR: {color: 'red'},
  INF: {color: 'cyan'},
  WAR: {color: 'yellow'}
}

export interface LoggerTags {
  src: string
  [tag: string]: string
}

export type LogData = JsonObject & { msg?: string }

export interface Log<T extends LogData = LogData> {
  lvl: LogLevel
  code: string
  tags: LoggerTags
  data?: T
  metrics?: Record<string, LogMetricMutation>
  timestamp: Date
}

const LOG_SCHEMA: JSONSchema4 = {
  type: 'object',
  required: ['code', 'lvl', 'tags'],
  properties: {
    lvl: {type: 'string', enum: [...LOG_LEVELS]},
    code: {type: 'string', pattern: '^[\\w-]{2,32}$'},
    data: {type: 'object', minProperties: 1},
    metrics: {
      type: 'object',
      patternProperties: {
        '^[\\w+]{2, 16}$': {
          type: 'array',
          items: LOG_METRIC_MUTATION_SCHEMA,
          minItems: 1
        }
      },
      additionalProperties: false,
      minProperties: 1
    },
    tags: {
      properties: {
        src: {type: 'string', pattern: '^[\\w-]{2,6}$'}
      },
      patternProperties: {
        '^[\\w-]{2,128}$': {type: 'string', pattern: '^[\\w-]{2,128}$'}
      },
      minProperties: 2,
      maxProperties: 64,
      additionalProperties: false
    }
  },
  additionalProperties: false
}

export class LogEvent {
  private static _validator: any
  constructor() {
    if (!LogEvent._validator) {
      LogEvent._validator = new Ajv().compile(LOG_SCHEMA)
    }
  }
}

export function LogEvent(log: Log): Event {
  if (!LOG_LEVELS.includes(log.lvl)) throw new TypeError('lvl is not included in LOG_LEVELS')
  if (!LOG_CODE_REGEX.test(log.code)) throw new TypeError('code is not matching LOG_CODE_REGEX')
  if (!LOG_SOURCES.includes(log.tags.src)) throw new TypeError('tags.src is not included LOG_SOURCES')
  const valid
}

export function matchTags(target: LoggerTags, test: Partial<LoggerTags>, extraTags = false): boolean {
  const result = !Object.keys(test).find(tag => target[tag] !== test[tag])
  if (!result || !extraTags) return result
  return Object.keys(test).length === Object.keys(target).length
}

export function filterByTags(tags: Partial<LoggerTags>): OperatorFunction<Log, Log> {
  return events => events.pipe(filter(e => matchTags(e.tags, tags)))
}

export function scanMetric<T extends LogMetricValue[number]>(metricName: string): OperatorFunction<Log, T[]> {
  return events => events.pipe(
    scan((metric, e) => {
      const mutation = (e.metrics || {})[metricName] as Record<string, LogMetricValue>
      if (!mutation) return metric
      return applyMetricMutation(metric, mutation) as T[]
    }, [] as T[]),
    startWith([] as T[]),
    distinctUntilChanged(),
    shareReplay(1)
  )
}
