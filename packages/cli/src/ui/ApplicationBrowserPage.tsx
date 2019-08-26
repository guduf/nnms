import React from 'react'

import { useApplicationContext } from './context'
import { PageComponentProps } from './paging'
import { Redirect } from 'react-router'
import { useObservable } from './util'
import { Observable } from 'rxjs';
import Table from 'ink-table';

export function ApplicationBrowserPage(
  {location, attachTextHandler}: PageComponentProps
): React.ReactElement {
  const kind = location.pathname.split('/')[1] as 'MODULES' | 'PROVIDERS' | 'PLUGINS'
  const ctx = useApplicationContext()
  const items = useObservable(() => (
    ctx[kind.toLocaleLowerCase() as 'modules' | 'providers' | 'plugins'] as Observable<{}[]>
  ), [kind, ctx.logger])
  const [redir, setRedir] = React.useState('')
  React.useEffect(() => {
    const handler = (entry: string) => {
      setRedir(entry)
      return true
    }
    attachTextHandler(handler, [])
  }, [])
  if (redir) return <Redirect to={`/${kind}/${redir}`} />
  return <Table data={items || []} />
}

export default ApplicationBrowserPage
