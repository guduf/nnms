import * as React from 'react'

import { Box } from 'ink'

import { LoggerEvent } from 'nnms'

import LoggerFormat from '../logger_format'

export interface LogProps {
  events: LoggerEvent[]
  format?: LoggerFormat
}

export function LogList(props: LogProps) {
  const texts = React.useMemo(() => {
    const format = props.format ? props.format : new LoggerFormat()
    return props.events.map(e => {
      try { return format.render(e) } catch (err) { return 'FORMAT_ERROR:' + err.message + '\n'  }
    })
  }, [props.events, props.format])
  return (
    <Box flexGrow={1}>{texts.join('\n')}</Box>
  )
}

export default LogList
