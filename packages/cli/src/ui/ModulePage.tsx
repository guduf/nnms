import React from 'react'

import { Box } from 'ink'

// import { useApplicationContext } from './context'
import { PageComponentProps } from './paging'
import LogList from './LogList';
import { LoggerEvent } from '../../../../tmp/build/1565856927604';

export interface PluginBrowserProps {
  modName: string
}

export function ModulePage(
  {id}: PageComponentProps
): React.ReactElement {
  // const state = useApplicationContext()
  if (!id) throw new Error('Missing module id')
  const item = {} // state.mods[id]
  const logFilter = React.useMemo(() => (e: LoggerEvent) => !!e, [item])
  return (
    <Box flexGrow={1} flexDirection="column" justifyContent="center" alignItems="center">
      <Box>MODULE: {id}</Box>
      <LogList staticFilter={logFilter}/>
    </Box>
  )
}

export default ModulePage
