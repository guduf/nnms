import React from 'react'

import c from 'chalk'
import { Box } from 'ink'

import ButtonGroup from './ButtonGroup'
import { useCommandInput } from './CommandInput'
import { useNNMS } from './context'
import { filelog } from './util'

export interface BrowserProps {
  kind: 'mods' | 'providers'
  modName?: never
}

export interface PluginBrowserProps {
  kind: 'plugins'
  modName: string
}

export function Browser(
  {kind, modName}: BrowserProps | PluginBrowserProps
): React.ReactElement {
  const state = useNNMS()
  const items = React.useMemo(() => {
    const items = kind === 'plugins' ? state.mods[modName as string].plugins : state[kind]

  }, [state.mods, state.providers])
  const handler = React.useMemo(() => (
    (query: string) => {
      filelog({kind, items})
      const i = Object.keys(items).indexOf(query)
      return i >= 0 ? Object.keys(items)[i] : ''
    }
  ), [])
  useCommandInput(handler)
  return (
    <Box flexGrow={1} flexDirection="column" justifyContent="center" alignItems="center">
      <Box flexDirection="column">
        <Box paddingX={1} marginBottom={1}>{c.blue('>MODULES')}</Box>
        <Box flexDirection="column" paddingX={1} marginBottom={1} width={60}>
          <Box>Type the name of a ${} or use arrows</Box>
          <Box>to select a ${} then press ENTER to browse it.</Box>
        </Box>
        <ButtonGroup items={{'todo': 'todo', 'http': 'http'}} />
      </Box>
    </Box>
  )
}

export default Browser
