import nnms from 'nnms'

export type LogRecord = nnms.LogRecord

export type LogTags = nnms.LogTags

export type LogLevel = nnms.LogLevel

export interface LogQuery {
  level: LogLevel
  tags: LogTags
}
