import React from 'react'

import chalk from 'chalk'
import Table from 'ink-table'
import { Box } from 'ink'
import { Redirect } from 'react-router'

import { useLog, AppMetrics } from './log_context'
import LogFormat from '../log_format'
import LogList from './LogList'
import { PageComponentProps } from './paging'
import { PageTitle } from './theme'
import { useObservable } from './util'

const logFormat = new LogFormat({printData: true})

export function DashboardPage(
  {attachTextHandler}: PageComponentProps
): React.ReactElement {
  const {appMetrics} = useLog()
  const items = useObservable(() => (appMetrics), []) as AppMetrics
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
        <Box flexDirection="column">
          {(['modules', 'plugins', 'providers'] as const).map(kind => {
            const value = (items || {})[kind]
            if (!value) return null
            return (
              <Box key={kind} flexDirection="column" marginRight={4} minWidth={40} height={15}>
                <Box marginBottom={1} marginX={1}>{chalk.cyan(`/${kind.toUpperCase()}`)}</Box>
                <Table<any> data={items ? value.slice(0, 10) : []}></Table>
              </Box>
            )
          })}
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
