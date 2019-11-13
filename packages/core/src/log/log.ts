import Ajv, { ValidateFunction } from 'ajv'
import { distinctUntilChanged, filter, scan, shareReplay, startWith } from 'rxjs/operators'
import { OperatorFunction } from 'rxjs'
import { JsonObject, JsonValue } from 'type-fest'

import { Event } from '../event'
import { ObjectId } from '../schema'
import { applyMetricMutation, LogMetricMutation, LogMetricValue, LOG_METRIC_MUTATION_SCHEMA } from './log_metric'
import { LogTags, LogLevel, LOG_RECORD_SCHEMA, LogRecord } from './log_record'

export type LogData = JsonObject & { msg?: string }

export interface LogValue {
  l: LogLevel
  c: string
  t: LogTags
  d?: LogData
  m?: Record<string, LogMetricMutation>
}

const LOG_SCHEMA = {
  ...LOG_RECORD_SCHEMA,
  properties: {
    ...LOG_RECORD_SCHEMA.properties,
    metrics: {
      type: 'object',
      patternProperties: {'^[\\w+]{2,32}$': LOG_METRIC_MUTATION_SCHEMA},
      additionalProperties: false,
      minProperties: 1
    }
  }
}

export class Log<T extends LogData = LogData> {
  // TODO - remove for global validator
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
      console.error(input, Log._validator.errors)
      throw new TypeError('invalid log')
    }
    const date = new Date()
    const id = new ObjectId(Math.floor(date.getTime() / 1e3))
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

  removeMetrics(): Log {
    const value = {...this._value}
    delete this._value.m
    return new Log(this.id, this.date, value)
  }

  serialize(): Buffer { return this.toEvent().serialize() }

  toEvent(): Event {
    return Event.create({
      type: 'LOG',
      id: this.id,
      data: JSON.stringify(this._value),
      timestamp: this.date
    })
  }

  toRecord(): LogRecord & JsonValue {
    return ({
      id: this.id,
      date: this.date,
      level: this.level,
      code: this.code,
      tags: this.tags,
      ...(this.data ? {data: this.data} : {})
    } as LogRecord & JsonValue)
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
