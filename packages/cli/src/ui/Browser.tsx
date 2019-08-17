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
    ['abricot', 'ananas', 'tomate', 'celeri', 'banane', 'banane rouge1', 'banane rouge2', 'kiwi']
    // kind === 'plugins' ? state.mods[modName as string].plugins : state[kind]
  ), [kind, modName, state.mods, state.providers])
  const {query, focus} = useCommandInput(() => {
    const entries = items
    const onSubmit = (name: string) => filelog({submit: name})
    return {entries, onSubmit}
  }, {}, [items.join("/")])
  return (
    <Box flexGrow={1} flexDirection="column" justifyContent="center" alignItems="center">
      <Box flexDirection="column">
        <Box paddingX={1} marginBottom={1}>{c.blue(`>${kind.toUpperCase()}`)}</Box>
        <Box flexDirection="column" paddingX={1} marginBottom={1} width={60}>
          <Box>Type the name of a {kind} or use arrows</Box>
          <Box>to select a {kind} then press ENTER to browse it.</Box>
        </Box>
        <ButtonGroup items={items} query={query} focus={focus}/>
      </Box>
    </Box>
  )
}

export default Browser
