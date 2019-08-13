import * as React from 'react'

import { Box } from 'ink'

import Header from './Header'
import Menu, { MenuProps } from './Menu'
import ModulePage from './ModulePage'
import { TerminalProvider } from './terminal'

export function Layout(): React.ReactElement {
  const [state, setState] = React.useState({
    menu:  null as 'Modules' | 'Providers' | null,
    active: null as string | null
  })
  const height = React.useMemo(() => (process.stdout.rows || 31) - 1, [])
  const menuProps = React.useMemo((): MenuProps => {
    switch(state.menu) {
      case 'Providers':
        return {
          title: 'Providers',
          entries: ['todo'],
          onSelect: mod => setState({...state, active: mod}),
          onBack: () => setState({...state, menu: null})
        }
      case 'Modules':
        return {
          title: 'Modules',
          entries: ['todo'],
          onSelect: provider => setState({...state, active: provider}),
          onBack: () => setState({...state, menu: null})
        }
      default:
        return {
          title: 'Menu',
          entries: ['Modules', 'Providers'],
          onSelect: menu => setState({...state, menu: menu as 'Modules' | 'Providers'})
        }
    }
  }, [state.menu])
  const page = React.useMemo(() => {
    if (state.menu === 'Modules' && state.active) return (
      <ModulePage mod={'todo'} />
    )
    return (
      <Box flexGrow={1}  justifyContent="center" alignItems="center">
        Select a entry in the left menu.
      </Box>
    )
  }, [state.menu, state.active])
  return (
    <TerminalProvider>
      <Box flexDirection="column" width="100%" height={height}>
        <Header />
        <Box flexGrow={1}>
          <Menu {...menuProps} />
          {page}
        </Box>
      </Box>
    </TerminalProvider>
  )
}

export default Layout
