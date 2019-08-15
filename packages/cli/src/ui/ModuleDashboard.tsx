import React from 'react'

import c from 'chalk'
import { Box } from 'ink'

import ButtonGroup from './ButtonGroup'
import { useCommandInput } from './CommandInput'
import { useNNMS } from './context';
import { filelog } from './util';

export function ModuleDashboard(): React.ReactElement {
  const {mods, providers} = useNNMS()
  const handler = React.useMemo(() => (
    (query: string) => {
      filelog([mods, providers])
      const i = Object.keys(mods).indexOf(query)
      return i >= 0 ? Object.keys(mods)[i] : ''
    }
  ), [])
  useCommandInput(handler)
  return (
    <Box flexGrow={1} flexDirection="column" justifyContent="center" alignItems="center">
      <Box flexDirection="column">
        <Box paddingX={1} marginBottom={1}>{c.blue('>MODULES')}</Box>
        <Box flexDirection="column" paddingX={1} marginBottom={1} width={60}>
          <Box>Type the name of a module or use arrows</Box>
          <Box>to select a module then press ENTER to browse it.</Box>
        </Box>
        <ButtonGroup items={{'todo': 'todo', 'http': 'http'}} />
      </Box>
    </Box>
  )
}

export default ModuleDashboard
