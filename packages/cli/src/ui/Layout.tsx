import * as React from 'react'
import { Box } from 'ink'

import { LoggerEvent } from 'nnms'

import SubjectTransport from '../subject_transport'
import Header from './Header'
import Menu, { MenuProps } from './Menu'
import LogList from './LogList'
import { TerminalProvider } from './terminal'
import { filelog } from 'src/util';

export interface LayoutProps {
  mods: string[],
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
  const [menu, setMenu] = React.useState(null as string | null)
  const menuProps = React.useMemo((): MenuProps => {
    switch(menu) {
      case 'Providers':
        return {
          title: 'Providers',
          entries: ['todo'],
          onSelect: mod => filelog(mod),
          onBack: () => setMenu(null)
        }
      case 'Modules':
        return {
          title: 'Modules',
          entries: ['todo'],
          onSelect: mod => filelog(mod),
          onBack: () => setMenu(null)
        }
      default:
        return {
          title: 'Menu',
          entries: ['Modules', 'Providers'],
          onSelect: menu => setMenu(menu)
        }
    }
  }, [menu])
  return (
    <TerminalProvider>
      <Box flexDirection="column" height={viewportHeight}>
        <Header />
        <Box>
          <Menu {...menuProps}/>
          <LogList events={events} />
        </Box>
      </Box>
    </TerminalProvider>
  )
}

export default Layout
