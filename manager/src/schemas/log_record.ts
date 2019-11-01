import { ObjectId } from 'bson'

import nnms, { Prop } from 'nnms'
import { Doc } from 'nnms-common'

const {data, level, code, tags} = nnms.LOG_RECORD_SCHEMA.properties

@Doc({indexes: [{key: {'id': 1}, unique: true}]})
export class LogRecord implements nnms.LogRecord {
  @Prop(true)
  id: ObjectId

  @Prop(level, true)
  level: nnms.LogLevel

  @Prop(code, true)
  code: string

  @Prop(true)
  date: Date

  @Prop(tags, true)
  tags: nnms.LogTags

  @Prop(data)
  data: nnms.LogData
}
