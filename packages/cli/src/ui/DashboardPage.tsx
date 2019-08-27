import React from 'react'

import { useApplicationContext } from './context'
import { PageComponentProps } from './paging'
import { Redirect } from 'react-router'
import { useObservable } from './util'
import { combineLatest } from 'rxjs';
import Table from 'ink-table';
import { Box } from 'ink';
import { PageTitle } from './theme'
import { map } from 'rxjs/operators';
import chalk from 'chalk';

export function DashboardPage(
  {attachTextHandler}: PageComponentProps
): React.ReactElement {
  const ctx = useApplicationContext()
  const items = useObservable(() => (
    combineLatest(ctx.modules, ctx.plugins, ctx.providers).pipe(
      map(([modules, plugins, providers]) => ({modules, plugins, providers})),
    )
  ), [])
  items
  chalk
  Table
  const [redir, setRedir] = React.useState('')
  React.useEffect(() => {
    const handler = (entry: string) => {
      setRedir(entry)
      return true
    }
    attachTextHandler(handler, [])
  }, [])
  if (redir) return <Redirect to={`/${redir}`} />
  return (
    <Box flexDirection="column">
      <PageTitle>Dashboard</PageTitle>
      <Box marginX={2}>
        {(['modules', 'plugins', 'providers'] as const).map(kind => (
          <Box key={kind} flexDirection="column" marginRight={4}>
            <Box marginBottom={1} marginX={1}>{chalk.cyan(`/${kind.toUpperCase()}`)}</Box>
            <Table<any> data={items ? items[kind] : []}></Table>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export default DashboardPage
