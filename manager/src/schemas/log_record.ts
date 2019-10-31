import { ObjectId } from 'bson'

import { Prop } from 'nnms'
import { Doc } from 'nnms-common'
import { LogLevel, LOG_RECORD_SCHEMA, LogRecord as ILogRecord, LogTags, LogData } from 'nnms'

const {data, level, code, tags} = LOG_RECORD_SCHEMA.properties

@Doc({
  indexes: [{key: {'id': 1}, unique: true}]
})
export class LogRecord implements ILogRecord {
  @Prop(true)
  id: ObjectId

  @Prop(level, true)
  level: LogLevel

  @Prop(code, true)
  code: string

  @Prop(true)
  date: Date

  @Prop(tags, true)
  tags: LogTags

  @Prop(data)
  data: LogData
}
