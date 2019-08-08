import * as React from 'react'
import { Box } from 'ink'

import { LoggerEvent } from 'nnms'

import SubjectTransport from '../subject_transport'
import LogList from './LogList'

export interface LayoutProps {
  transport: SubjectTransport
}

export function Layout(
  {transport}: LayoutProps
): React.ReactElement {
  const [events, setEvents] = React.useState([] as LoggerEvent[])
  React.useEffect(() => {
    const subscr = transport.events.subscribe(e => setEvents([...events, e]))
    return () => subscr.unsubscribe()
  }, [transport, events])
  const viewportHeight = (process.stdout.rows || 16) - 1
  return (
    <Box height={viewportHeight}>
      <LogList events={events} />
    </Box>
  )
}

export default Layout
