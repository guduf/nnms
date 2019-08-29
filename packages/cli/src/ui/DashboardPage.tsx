import React from 'react'

import { getContainerContext } from 'nnms'
import { PageComponentProps } from './paging'
import { Redirect } from 'react-router'
import { useObservable } from './util'
import { combineLatest } from 'rxjs';
import Table from 'ink-table';
import { Box } from 'ink';
import { PageTitle } from './theme'
import { map } from 'rxjs/operators';
import chalk from 'chalk';
import LogList from './LogList'
import LogFormat from '../log_format';

const logFormat = new LogFormat({printData: true})

export function DashboardPage(
  {attachTextHandler}: PageComponentProps
): React.ReactElement {
  const ctx = getContainerContext()
  const items = useObservable(() => (
    combineLatest(ctx.modules, ctx.plugins, ctx.providers).pipe(
      map(([modules, plugins, providers]) => ({modules, plugins, providers})),
    )
  ), [])
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
    <Box flexDirection="column" flexGrow={1}>
      <PageTitle>Dashboard</PageTitle>
      <Box marginTop={1}  marginX={3}>
        <Box  flexDirection="column">
          {(['modules', 'plugins', 'providers'] as const).map(kind => (
            <Box key={kind} flexDirection="column" marginRight={4} minWidth={40} height={15}>
              <Box marginBottom={1} marginX={1}>{chalk.cyan(`/${kind.toUpperCase()}`)}</Box>
              <Table<any> data={items ? items[kind].slice(0, 10) : []}></Table>
            </Box>
          ))}
        </Box>
        <Box flexDirection="column" flexGrow={1}>
          <Box marginBottom={1} marginX={1}>{chalk.cyan(`/LOGS`)}</Box>
          <LogList format={logFormat}/>
        </Box>
      </Box>
    </Box>
  )
}

export default DashboardPage
