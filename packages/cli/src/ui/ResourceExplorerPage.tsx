import React from 'react'

import chalk from 'chalk';
import { Box } from 'ink'

import LogList from './LogList'
import { PageComponentProps } from './paging'
import { PageTitle } from './theme';

export interface PluginBrowserProps {
  modName: string
}

export function ResourceExplorerPage(
  {location, id}: PageComponentProps
): React.ReactElement {
  if (!id) throw new Error('Missing module id')
  const kind = location.pathname.split('/')[1] as 'MODULES' | 'PROVIDERS' | 'PLUGINS'
  const src = kind === 'MODULES' ? 'mod' : kind === 'PROVIDERS' ? 'prov' : 'plug'
  return (
    <Box flexGrow={1} flexDirection="column">
      <PageTitle>{`${kind[0] + kind.slice(1, -1).toLowerCase()} Explorer  ${chalk.white(id)}`}</PageTitle>
      <Box marginX={2}>
        <Box>
          <LogList filter={{src, id}} />
        </Box>
      </Box>
    </Box>
  )
}

export default ResourceExplorerPage
