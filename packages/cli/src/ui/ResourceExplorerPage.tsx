import React from 'react'

import chalk from 'chalk';
import { Box } from 'ink'

import { useApplicationContext } from './context'
import Table from 'ink-table'
import LogList from './LogList'
import { PageComponentProps } from './paging'
import { PageTitle } from './theme';
import { useObservable } from './util'
import { filter, mergeMap, scan, distinctUntilChanged, map, shareReplay } from 'rxjs/operators';
import { matchTags } from 'nnms';
import { EMPTY } from 'rxjs/internal/observable/empty';
import { from, Observable } from 'rxjs';

export interface PluginBrowserProps {
  modName: string
}

export function ResourceExplorerPage(
  {location, id}: PageComponentProps
): React.ReactElement {
  if (!id) throw new Error('Missing module id')
  const kind = location.pathname.split('/')[1] as 'MODULES' | 'PROVIDERS' | 'PLUGINS'
  const src = kind === 'MODULES' ? 'mod' : kind === 'PROVIDERS' ? 'prov' : 'plug'
  const {logger: {events}} = useApplicationContext()
  const metrics = useObservable(() => {
    const src = kind === 'MODULES' ? 'mod' : kind === 'PROVIDERS' ? 'prov' : 'plug'
    const filteredEvents = events.pipe(
      filter(e => matchTags(e.tags, {src, [src]: id})),
      shareReplay()
    )
    return filteredEvents.pipe(
      filter(e => matchTags(e.tags, {src, [src]: id})),
      mergeMap(e => e.metrics ? from(Object.keys(e.metrics)) : EMPTY),
      scan((acc, metricName) => {
        if (Object.keys(acc).includes(metricName)) return acc
        return {...acc, [metricName]: EMPTY}
      }, {} as { [metricName: string]: Observable<any[]> }),
      distinctUntilChanged(),
      mergeMap(metricsMap => (
        from(Object.keys(metricsMap)).pipe(
          mergeMap(metricName => metricsMap[metricName].pipe(map(data => ({metricName, data}))))
        )
      )),
      scan((acc, {metricName, data}) => ({...acc, [metricName]: data}), {} as { [metricName: string]: any[] })
    )
  }, [id])
  return (
    <Box flexGrow={1} flexDirection="column">
      <PageTitle>{`${kind[0] + kind.slice(1, -1).toLowerCase()} Explorer  ${chalk.white(id)}`}</PageTitle>
      <Box marginX={2}>
        <Box width={40}>
          {Object.keys(metrics || {}).map(metricName => (
            <Box key={metricName} flexDirection="column">
              <Box marginX={1}>{chalk.cyan(metricName)}</Box>
              <Table data={(metrics || {})[metricName]} />
            </Box>
          ))}
        </Box>
        <Box>
          <LogList staticFilter={e => e.tags.src === src && e.tags[src] === id}/>
        </Box>
      </Box>
    </Box>
  )
}

export default ResourceExplorerPage
