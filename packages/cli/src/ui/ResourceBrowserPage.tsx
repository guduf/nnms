import React from 'react'
import { PageComponentProps } from './paging'
import { Redirect } from 'react-router'
import { useObservable } from './util'
import { Observable } from 'rxjs';
import Table from 'ink-table';
import { Box, Color } from 'ink';
import { PageTitle } from './theme'
import { getContainerContext } from 'nnms'

export function ResourceBrowserPage(
  {location, attachTextHandler, commandState: {focus}}: PageComponentProps
): React.ReactElement {
  const kind = location.pathname.split('/')[1] as 'MODULES' | 'PROVIDERS' | 'PLUGINS'
  const ctx = React.useMemo(() => getContainerContext(), [])
  const metrics = useObservable(() => {
    const ctxKey = kind.toLocaleLowerCase() as 'modules' | 'providers' | 'plugins'
    return ctx[ctxKey] as Observable<{ name: string }[]>
  }, []) || []
  const styledItems = metrics.map(metric => {
    return Object.keys(metric).reduce((acc, key) => (
      {...acc, [key]: (metric.name !== focus ? '!' : ' ') + metric[key as 'name']})
    , {} as { name: string })
  })
  const [redir, setRedir] = React.useState('')
  React.useEffect(() => {
    const handler = (entry: string) => {
      setRedir(entry)
      return true
    }
    attachTextHandler(handler, metrics.map(item => item.name))
  }, [metrics.map(item => item.name).join(',')])
  if (redir) return <Redirect to={`/${kind}/${redir}`} />
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
