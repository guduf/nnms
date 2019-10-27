import { JsonObject } from 'type-fest'
import { ObjectId } from 'bson'

export const LOG_RECORD_LEVELS = ['DBG', 'ERR', 'INF', 'WAR'] as const

export type LogLevel = typeof LOG_RECORD_LEVELS[number]

export interface LogTags {
  logger: string
  src: string
  [tag: string]: string
}

export type LogRecord = Readonly<{
  id: ObjectId
  level: LogLevel
  code: string
  date: Date
  tags: Readonly<LogTags>
  data?: Readonly<JsonObject>
}>

export const LOG_RECORD_SCHEMA = {
  type: 'object',
  required: ['code', 'level', 'tags'],
  properties: {
    level: {type: 'string', enum: [...LOG_RECORD_LEVELS] as string[]},
    code: {type: 'string', pattern: '^\\*?[\\w-]{2,32}$'},
    date: {type: 'string', pattern: '/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/'},
    tags: {
      type: 'object',
      required: ['logger', 'src'] as string[],
      properties: {
        logger: {type: 'string', pattern: '^[\\w-_]{7,14}$'},
        src: {type: 'string', pattern: '^[\\w-]{2,6}$'}
      },
      patternProperties: {'^[\\w-]{2,128}$': {type: 'string', minimum: 2, maximum: 128}},
      minProperties: 2,
      maxProperties: 64,
      additionalProperties: false
    },
    data: {type: 'object', minProperties: 1}
  },
  additionalProperties: false
} as const
