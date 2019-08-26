import React from 'react'

import { Box } from 'ink'

import { useNNMS } from './context'
import { PageComponentProps } from './paging'
import LogList from './LogList';

export interface PluginBrowserProps {
  modName: string
}

export function ModulePage(
  {id}: PageComponentProps
): React.ReactElement {
  const state = useNNMS()
  if (!id) throw new Error('Missing module id')
  const item = state.mods[id]
  return (
    <Box flexGrow={1} flexDirection="column" justifyContent="center" alignItems="center">
      <Box>MODULE: {item.context.id}</Box>
      <LogList />
    </Box>
  )
}

export default ModulePage
