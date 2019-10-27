import { ObjectId } from 'bson'

import { DocSchema, DocProp } from 'nnms-common'
import { LogLevel, LOG_RECORD_SCHEMA, LogRecord as ILogRecord, LogTags, LogData } from 'nnms'

const {data, level, code, tags} = LOG_RECORD_SCHEMA.properties

@DocSchema('logRecords', {
  indexes: [{key: {'id': 1}, unique: true}]
})
export class LogRecord implements ILogRecord {
  @DocProp(true)
  id: ObjectId

  @DocProp(level, true)
  level: LogLevel

  @DocProp(code, true)
  code: string

  // TODO - remove any assertion
  @DocProp(true)
  date: Date

  // TODO - remove any assertion
  @DocProp(tags as any, true)
  tags: LogTags

  // TODO - remove any assertion
  @DocProp(data as any)
  data: LogData
}
