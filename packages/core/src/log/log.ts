import Ajv, { ValidateFunction } from 'ajv'
import { ObjectId } from 'bson'
import { JSONSchema4 as JsonSchema } from 'json-schema'
import { distinctUntilChanged, filter, scan, shareReplay, startWith } from 'rxjs/operators'
import { OperatorFunction } from 'rxjs'
import { JsonObject } from 'type-fest'

import { Event } from '../event'
import { applyMetricMutation, LogMetricMutation, LogMetricValue, LOG_METRIC_MUTATION_SCHEMA } from './log_metric'

export const LOG_LEVELS = ['DBG', 'ERR', 'INF', 'WAR'] as const

export type LogLevel = typeof LOG_LEVELS[number]

export const LOG_LEVEL_PROPS: { [level in LogLevel]: { color: string} } = {
  DBG: {color: 'white'},
  ERR: {color: 'red'},
  INF: {color: 'cyan'},
  WAR: {color: 'yellow'}
}

export interface LogTags {
  src: string
  [tag: string]: string
}

export type LogData = JsonObject & { msg?: string }

export interface LogValue {
  l: LogLevel
  c: string
  t: LogTags
  d?: LogData
  m?: Record<string, LogMetricMutation>
}

export class Log<T extends LogData = LogData> {
  private static _validator: ValidateFunction

  static fromEvent<T extends LogData = LogData>(e: Event): Log<T> {
    return new Log<T>(e.id, e.timestamp, JSON.parse(e.data.toString()))
  }

  static create<T extends LogData = LogData>(
    input: Pick<Log, 'level' | 'code' | 'tags' | 'metrics' | 'data'>
  ): Log<T> {
    if (!Log._validator) Log._validator = new Ajv().compile(LOG_SCHEMA)
    if (typeof input.data === 'object' && !Object.keys(input.data).length) {
      input = {...input}
      delete (input as { data: {}}).data
    }
    const valid = Log._validator(input)
    if (!valid) {
      console.error(Log._validator.errors)
      throw new TypeError('invalid log')
    }
    const date = new Date()
    const id = ObjectId.createFromTime(date.getTime() / 1e3)
    const value = {
      l: input.level,
      c: input.code,
      t: input.tags,
      d: input.data,
      m: input.metrics
    }
    return new Log<T>(id, date, value)
  }

  private constructor(
    readonly id: ObjectId,
    readonly date: Date,
    private readonly _value: LogValue
  ) { }

  get level(): LogLevel { return this._value.l }
  get code(): string { return this._value.c }
  get tags(): LogTags { return this._value.t }
  get data(): T | undefined { return this._value.d as T | undefined }
  get metrics(): Record<string, LogMetricMutation> | undefined { return this._value.m }

  serialize(): Buffer { return this.toEvent().serialize() }

  toEvent(): Event {
    return Event.create({
      type: 'LOG',
      id: this.id,
      data: JSON.stringify(this._value),
      timestamp: this.date
    })
  }

  toJson(): JsonObject {
    return {
      id: this.id.toHexString(),
      date: this.date.toISOString(),
      level: this.level,
      code: this.code,
      tags: this.tags,
      ...(this.data ? {data: this.data} : {}),
      ...(this.metrics ? {metrics: this.metrics} : {}),
    } as JsonObject
  }
}

const LOG_SCHEMA: JsonSchema = {
  type: 'object',
  required: ['code', 'level', 'tags'],
  properties: {
    level: {type: 'string', enum: [...LOG_LEVELS]},
    code: {type: 'string', pattern: '^\\*?[\\w-]{2,32}$'},
    data: {type: 'object', minProperties: 1},
    timestamp: {type: 'string', format: 'date-time'},
    metrics: {
      type: 'object',
      patternProperties: {'^[\\w+]{2,32}$': LOG_METRIC_MUTATION_SCHEMA},
      additionalProperties: false,
      minProperties: 1
    },
    tags: {
      properties: {src: {type: 'string', pattern: '^[\\w-]{2,6}$'}},
      patternProperties: {'^[\\w-]{2,128}$': {type: 'string', minimum: 2, maximum: 128}},
      minProperties: 2,
      maxProperties: 64,
      additionalProperties: false
    }
  },
  additionalProperties: false
}
export function matchTags(target: LogTags, test: Partial<LogTags>, extraTags = false): boolean {
  const result = !Object.keys(test).find(tag => target[tag] !== test[tag])
  if (!result || !extraTags) return result
  return Object.keys(test).length === Object.keys(target).length
}

export function filterByTags(tags: Partial<LogTags>): OperatorFunction<Log, Log> {
  return events => events.pipe(filter(e => matchTags(e.tags, tags)))
}

export function scanMetric<T extends LogMetricValue>(metricName: string): OperatorFunction<Log, T[]> {
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
