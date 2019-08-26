import React from 'react'

import { Box } from 'ink'

import { PageComponentProps } from './paging'
import LogList from './LogList'
import { PageTitle } from './theme';
import chalk from 'chalk';

export interface PluginBrowserProps {
  modName: string
}

export function ModulePage(
  {id}: PageComponentProps
): React.ReactElement {
  if (!id) throw new Error('Missing module id')
  return (
    <Box flexGrow={1} flexDirection="column">
      <PageTitle>{`Module Explorer  ${chalk.white(id)}`}</PageTitle>
      <Box marginX={2}>
        <LogList />
      </Box>
    </Box>
  )
}

export default ModulePage
