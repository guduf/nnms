import React from 'react'

import c from 'chalk'
import { Box } from 'ink'

import ButtonGroup from './ButtonGroup'
import { useNNMS } from './context'
import { PageComponentProps } from './paging'
import { Redirect } from 'react-router'

export function ResourceBrowserPage(
  {location, commandState: {query, focus}, attachTextHandler}: PageComponentProps
): React.ReactElement {
  const kind = location.pathname.split('/')[1] as 'MODULES' | 'PROVIDERS'
  const state = useNNMS()
  const items = React.useMemo(() => (
    Object.keys(kind === 'MODULES' ? state.mods : state.providers)
  ), [kind, state.mods, state.providers])
  const [redir, setRedir] = React.useState('')
  React.useEffect(() => {
    const handler = (entry: string) => {
      setRedir(entry)
      return true
    }
    attachTextHandler(handler, items)
  }, [items.join('/')])
  if (redir) return <Redirect to={`/${kind}/${redir}`} />
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

export default ResourceBrowserPage
