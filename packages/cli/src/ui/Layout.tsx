import * as React from 'react'

import { Box } from 'ink'

import CommandInput from './CommandInput'
import Header from './Header'
import { Switch, Route, RouteProps, RouteComponentProps, Redirect } from 'react-router';
import PageLayout from './PageLayout'

const ROUTES: (RouteProps & { path: string })[] = [
  {path: '/MODULES', component: (route: RouteComponentProps) => <PageLayout {...{route}} /> },
  {path: '/MODULES/:id', component: (route: RouteComponentProps) => <PageLayout {...{route}} /> },
  {path: '/PROVIDERS', component: (route: RouteComponentProps) => <PageLayout {...{route}} /> },
  {path: '/PROVIDERS/:id', component: (route: RouteComponentProps) => <PageLayout {...{route}} /> },
  {path: '', component: () => <Redirect to="MODULES" />}
]

export function Layout(): React.ReactElement {
  const height = React.useMemo(() => (process.stdout.rows || 31) - 1, [])
  return (
      <Box flexDirection="column" width="100%" height={height}>
        <Header />
        <CommandInput>
          <Box flexGrow={1}>
            <Switch>
              {ROUTES.map(route => <Route key={route.path} {...route} />)}
            </Switch>
          </Box>
        </CommandInput>
      </Box>
  )
}

export default Layout
