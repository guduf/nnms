import React from 'react'

import { Box, Color, Text } from 'ink'

import { LoggerEvent } from 'nnms'
import LogList from './LogList'
import { useBoxWidth, wrapText } from './util'

export function ModulePage({mod, events}: { mod: { name: string }, events: LoggerEvent[] }): React.ReactElement {
  const [boxRef, boxWidth] = useBoxWidth()
  return (
    <Box flexDirection="column" ref={boxRef} flexGrow={1}>
      {
        boxWidth ?
          [
            <Text key="text"><Color bgBlackBright>{wrapText(mod.name, boxWidth) + '\n'}</Color></Text>,
            <LogList key="logList" events={events} />
          ] :
          null
      }
    </Box>
  )
}

export default ModulePage
