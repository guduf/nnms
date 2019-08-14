import React from 'react'
import { useNNMS } from './context'
import Menu, { MenuProps } from './Menu'
import { Box } from 'ink'
import { RouteComponentProps, Redirect } from 'react-router'
import { filelog } from './util'

export function Dashboard(props: RouteComponentProps<{ menu: string }>): React.ReactElement {
  const {providers, mods} = useNNMS()
  const [redir, setRedir] = React.useState('')
  const activatedPath = props.location.pathname.split('/')[2]
  filelog([props.location.pathname, props.match, {activatedPath}])
  const menuProps = React.useMemo((): MenuProps => {
    switch(activatedPath) {
      case 'prov':
        return {
          title: 'Providers',
          entries: Object.keys(providers),
          onSelect: mod => setRedir(`/mod/${mod}`),
          onBack: () => setRedir('/')
        }
      case 'mod':
        return {
          title: 'Modules',
          entries: Object.keys(mods),
          onSelect: prov => setRedir(`/prov/${prov}`),
          onBack: () => setRedir('/')
        }
      default:
        return {
          title: 'Menu',
          entries: ['Modules', 'Providers'],
          onSelect: menu => setRedir(menu === 'Modules' ? '/mod' : '/prov')
        }
    }
  }, [activatedPath])
  if (redir) return <Redirect to={redir} />
  return (
    <Box flexDirection="column" width="100%" flexGrow={1}>
      <Menu {...menuProps} />
    </Box>
  )
}

export default Dashboard
