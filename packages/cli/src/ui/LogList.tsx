import * as React from 'react'

import { Box } from 'ink'


import LogFormat from '../log_format'
import { useBoxSize, useObservable } from './util';
import { LoggerSource } from 'nnms';
import { useLog } from './log_context';

export interface LogProps {
  format?: LogFormat
  filter?: {
    src: LoggerSource
    id: string
  }
}

export function LogList({filter, format}: LogProps) {
  const [ref, {height}] = useBoxSize()
  const {store} = useLog()
  const logs = useObservable(() => (
    filter ? store.getLogs(filter.src, filter.id) : store.getAllLogs()
  ), [filter])
  const texts = React.useMemo(() => {
    const logFormat = format ? format : new LogFormat()
    return (logs || []).slice(-(height || 0) / 2).map(e => {
      try { return logFormat.render(e) } catch (err) { return 'FORMAT_ERROR:' + err.message + '\n' }
    })
  }, [logs, format, height])
  return (
    <Box ref={ref} flexGrow={1}>{texts.join('\n')}</Box>
  )
}

export default LogList
