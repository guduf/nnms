import { Log, LogData } from 'nnms'

export type LogRecord<T extends LogData = LogData> = {
  id: Log['id']
  level: Omit<Log['code'], 'DBG'>
  code: Log['code']
  tags: Log['tags']
  data: Log<T>['data']
}

export function LogRecord(log: Log): LogRecord {
  if (!(log instanceof Log)) throw new Error('log is not instanceof Log')
  return {
    id: log.id,
    level: log.level,
    code: log.code,
    tags: log.tags,
    data: log.data
  }
}
