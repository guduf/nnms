import React from 'react'

import chalk from 'chalk'
import Table from 'ink-table'
import { Box } from 'ink'

import LogList from './LogList'
import { PageComponentProps } from './paging'
import { PageTitle } from './theme'
import { useLog } from './log_context'
import { useObservable, filelog } from './util'
import { JsonObject } from 'type-fest'

export interface PluginBrowserProps {
  modName: string
}

export function ResourceExplorerPage(
  {location, id}: PageComponentProps
): React.ReactElement {
  const frags = location.pathname.split('/')
  const kind = frags.slice(-2)[0] as 'MODULES' | 'PROVIDERS' | 'PLUGINS'
  if (kind === 'PLUGINS') id = `${frags[2]}+${frags[4]}`
  const src = kind === 'MODULES' ? 'mod' : kind === 'PROVIDERS' ? 'prov' : 'plug'
  if (!id) throw new Error('Missing module id')
  const {store} = useLog()
  const metrics = useObservable(() => store.getMetrics(src, id as string), [src, id]) || {}
  filelog(metrics)
  return (
    <Box flexGrow={1} flexDirection="column">
      <PageTitle>{`${kind[0] + kind.slice(1, -1).toLowerCase()} Explorer  ${chalk.white(id)}`}</PageTitle>
      <Box marginX={2}>
        <Box flexDirection="column" minWidth={40}>
          <Box marginBottom={1}>{chalk.cyanBright('./METRICS')}</Box>
          {Object.keys(metrics).map(key => {
            const metricValue = metrics[key]
            if (['string', 'number', 'boolean'].includes(typeof metricValue)) return (
              <Box key={key} marginLeft={1}>{chalk.magenta(`${key}:`)} {metricValue}</Box>
              )
            return (
              <Box key={key} flexDirection="column">
                <Box>{chalk.bgCyanBright(` ${chalk.black(key)} `)}</Box>
                <Table data={(metricValue || []) as JsonObject[]} />
              </Box>
            )
          })}
        </Box>
        <Box flexDirection="column">
          <Box marginBottom={1}>{chalk.cyan('./LOGS')}</Box>
          <LogList filter={{src, id}} />
        </Box>
      </Box>
    </Box>
  )
}

export default ResourceExplorerPage
