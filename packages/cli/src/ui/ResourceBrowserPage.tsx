import React from 'react'

import Table from 'ink-table'
import { Box, Color } from 'ink'
import { Redirect } from 'react-router'
import { map } from 'rxjs/operators'

import { PageTitle } from './theme'
import { useLog } from './log_context'
import { PageComponentProps } from './paging'
import { useObservable } from './util'

export function ResourceBrowserPage(
  {location, attachTextHandler, commandState: {focus}}: PageComponentProps
): React.ReactElement {
  const kind = location.pathname.split('/')[1] as 'MODULES' | 'PROVIDERS' | 'PLUGINS'
  const {appMetrics} = useLog()
  const metrics = useObservable(() => (
    appMetrics.pipe(map(metrics => metrics[kind.toLocaleLowerCase()] as { name: string }[]))
  ), [appMetrics]) || []
  const styledItems = metrics.map(metric => {
    return Object.keys(metric).reduce((acc, key) => (
      {...acc, [key]: (metric.name !== focus ? '!' : ' ') + metric[key as 'name']})
    , {} as { name: string })
  })
  const [redir, setRedir] = React.useState('')
  React.useEffect(() => {
    const handler = (entry: string) => {
      if (kind !== 'PLUGINS') {
        setRedir(`/${kind}/${entry}`)
        return true
      }
      const [mod, plugin] = entry.split('+')
      setRedir(`/MODULES/${mod}/PLUGINS/${plugin}`)
      return true
    }
    attachTextHandler(handler, metrics.map(item => item.name))
  }, [metrics.map(item => item.name).join(',')])
  if (redir) return <Redirect to={redir} />
  return (
    <Box flexDirection="column">
      <PageTitle>{`${kind[0] + kind.slice(1, -1).toLowerCase()} Browser`}</PageTitle>
      <Box marginX={2}>
        <Table
          data={styledItems}
          cell={(props: { children: string[] }) => {
            const children = [...props.children, ' ']
            const selected = children[1][0] === '!'
            children[1] = children[1].slice(1)
            if (selected) return children
            return <Color yellow>{children}</Color>
          }}/>
      </Box>
    </Box>
  )
}

export default ResourceBrowserPage
