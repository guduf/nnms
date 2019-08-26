import * as React from 'react'

import { Box } from 'ink'

import { LoggerEvent } from 'nnms'

import LoggerFormat from '../logger_format'
import { useNNMS } from './context'
import { filter, scan } from 'rxjs/operators'
import { filelog } from './util';

export interface LogProps {
  filter?: string
  format?: LoggerFormat
  staticFilter?: (e: LoggerEvent) => boolean
}

export function LogList(props: LogProps) {
  const {events} = useNNMS()
  const [logs, setLogs] = React.useState([] as LoggerEvent[])
  React.useEffect(() => {
    filelog('subscr')
    const subscr = events.pipe(
      filter(e => {
        filelog(e)
        if (typeof props.staticFilter === 'function' && !props.staticFilter(e)) return false
        return !props.filter || e.uri.includes(props.filter)
      }),
      scan((acc, e) => [...acc, e], [] as LoggerEvent[])
    ).subscribe(logs => setLogs(logs))
    return () => subscr.unsubscribe()
  }, [events, props.filter])
  const texts = React.useMemo(() => {
    const format = props.format ? props.format : new LoggerFormat()
    return logs.map(e => {
      try { return format.render(e) } catch (err) { return 'FORMAT_ERROR:' + err.message + '\n'  }
    })
  }, [logs, props.format])
  return (
    <Box flexGrow={1}>{texts.join('\n')}</Box>
  )
}

export default LogList

