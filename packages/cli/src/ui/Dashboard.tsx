import React from 'react'
import { useNNMS } from './context'
import Menu, { MenuProps } from './Menu'
import { Box } from 'ink'
import { RouteComponentProps, Redirect, Switch, Route } from 'react-router'
import { filelog } from './util'
import ModulePage from './ModulePage'
import ProviderPage from './ProviderPage'

export function Dashboard(props: RouteComponentProps<{ menu?: 'mod' | 'prov' }>): React.ReactElement {
  const {providers, mods} = useNNMS()
  const [redir, setRedir] = React.useState('')
  const [menu, setMenu] = React.useState(() => {
    filelog({path: props.location.pathname, menu: props.match.params.menu || null})
    return props.match.params.menu || null
  })
  filelog(props.location.pathname)
  const menuProps = React.useMemo((): MenuProps => {
    switch(menu) {
      case 'prov':
        return {
          title: 'Providers',
          entries: Object.keys(providers),
          onSelect: mod => setRedir(`/mod/${mod}`),
          onBack: () => setMenu(null)
        }
      case 'mod':
        return {
          title: 'Modules',
          entries: Object.keys(mods),
          onSelect: prov => setRedir(`/prov/${prov}`),
          onBack: () => setMenu(null)
        }
      default:
        return {
          title: 'Menu',
          entries: ['Modules', 'Providers'],
          onSelect: menu => setMenu(menu === 'Modules' ? 'mod' : 'prov')
        }
    }
  }, [menu])
  if (redir) {
    const redirect = <Redirect to={`/dashboard${redir}`}/>
    filelog({redirectTo: `/dashboard${redir}`})
    setRedir('')
    return redirect
  }
  return (
    <Box flexDirection="column" width="100%" flexGrow={1}>
      <Menu {...menuProps} />
      <Switch>
        <Route path={'/dashboard/mod/:modName'} component={ModulePage}/>
        <Route path={'/dashboard/prov/:provName'} component={ProviderPage}/>
      </Switch>
    </Box>
  )
}

export default Dashboard
