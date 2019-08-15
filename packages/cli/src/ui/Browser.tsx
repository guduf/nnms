import React from 'react'

import c from 'chalk'
import { Box } from 'ink'

import ButtonGroup from './ButtonGroup'
import { useCommandInput } from './command'
import { useNNMS } from './context'
import { filelog } from './util';

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
    ['abricot', 'tomate', 'celeri', 'banane', 'kiwi']
    // kind === 'plugins' ? state.mods[modName as string].plugins : state[kind]
  ), [kind, modName, state.mods, state.providers])
  const [focus, setFocus] = React.useState('')
  useCommandInput(() => {
    const entries = items
    const onFocus = (name: string) => setFocus(name)
    const onSubmit = (name: string) => filelog({name})
    return {entries, onFocus, onSubmit}
  }, [items.join("/")])
  return (
    <Box flexGrow={1} flexDirection="column" justifyContent="center" alignItems="center">
      <Box flexDirection="column">
        <Box paddingX={1} marginBottom={1}>{c.blue(`>${kind}`)}</Box>
        <Box flexDirection="column" paddingX={1} marginBottom={1} width={60}>
          <Box>Type the name of a {kind} or use arrows</Box>
          <Box>to select a {kind} then press ENTER to browse it.</Box>
          <Box>{focus}</Box>
        </Box>
        <ButtonGroup items={items} />
      </Box>
    </Box>
  )
}

export default Browser
