import React from 'react'

import c from 'chalk'
import { Box } from 'ink'

import ButtonGroup from './ButtonGroup'
import { useCommandInput } from './command'
import { useNNMS } from './context'

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
  const items = React.useMemo(() => (
    kind === 'plugins' ? state.mods[modName as string].plugins : state[kind]
  ), [kind, modName, state.mods, state.providers])
  const [focus, setFocus] = React.useState('')
  useCommandInput(() => {
    const entries = Object.keys(items)
    const onFocus = (name: string) => setFocus(name)
    return {entries, onFocus}
  }, [items])
  return (
    <Box flexGrow={1} flexDirection="column" justifyContent="center" alignItems="center">
      <Box flexDirection="column">
        <Box paddingX={1} marginBottom={1}>{c.blue('>MODULES')}</Box>
        <Box flexDirection="column" paddingX={1} marginBottom={1} width={60}>
          <Box>Type the name of a ${} or use arrows</Box>
          <Box>to select a ${} then press ENTER to browse it.</Box>
          <Box>{focus}</Box>
        </Box>
        <ButtonGroup items={Object.keys(items)} />
      </Box>
    </Box>
  )
}

export default Browser
