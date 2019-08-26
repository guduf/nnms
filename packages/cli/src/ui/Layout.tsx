import * as React from 'react'

import { Box } from 'ink'

import CommandInput from './CommandInput'
import Header from './Header'
import { Switch, Route, RouteProps, Redirect } from 'react-router'
import PageLayout from './PageLayout'
import { PageConfig, PAGE_CONFIGS } from './paging'

export function parsePageConfig(
  prefix: string,
  cfg: PageConfig
): (RouteProps & { path: string })[] {
  const route: RouteProps & { path: string } = {
    path: `${prefix}/${cfg.path}`,
    component: PageLayout
  }
  return (cfg.children || []).reduce((acc, child) => [
    ...acc,
    ...parsePageConfig(`${prefix}/${cfg.path}`, child)
  ], [route]).reverse()
}

const ROUTES: (RouteProps & { path: string })[] = PAGE_CONFIGS.reduce((acc, cfg) => [
  ...acc,
  ...parsePageConfig('', cfg)
], [] as RouteProps & { path: string }[])

export function Layout(): React.ReactElement {
  const height = React.useMemo(() => (process.stdout.rows || 31) - 1, [])
  return (
      <Box flexDirection="column" width="100%" height={height}>
        <Header />
        <CommandInput>
          <Box flexGrow={1}>
            <Switch>
              {ROUTES.map(route => <Route key={route.path} {...route} />)}
              <Route path='' component={() => <Redirect to={'/DASHBOARD'} />} />
            </Switch>
          </Box>
        </CommandInput>
      </Box>
  )
}

export default Layout
