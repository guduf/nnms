import React from 'react'

import { Box } from 'ink'

import { PageComponentProps } from './paging'
import LogList from './LogList'
import { PageTitle } from './theme';
import chalk from 'chalk';

export interface PluginBrowserProps {
  modName: string
}

export function ResourceExplorerPage(
  {location, id}: PageComponentProps
): React.ReactElement {
  if (!id) throw new Error('Missing module id')
  const kind = location.pathname.split('/')[1] as 'MODULES' | 'PROVIDERS' | 'PLUGINS'
  const resource = kind === 'MODULES' ? 'mod' : kind === 'PROVIDERS' ? 'prov' : 'plug'
  return (
    <Box flexGrow={1} flexDirection="column">
      <PageTitle>{`${kind[0] + kind.slice(1, -1).toLowerCase()} Explorer  ${chalk.white(id)}`}</PageTitle>
      <Box marginX={2}>
        <LogList staticFilter={e => e.tags.resource === resource && e.tags[resource] === id}/>
      </Box>
    </Box>
  )
}

export default ResourceExplorerPage
