import * as React from 'react'

import { Box } from 'ink'

import CommandInput from './CommandInput'
import Browser from './Browser'
import Header from './Header'
// import { Switch, Route, Redirect } from 'react-router'

export function Layout(): React.ReactElement {
  const height = React.useMemo(() => (process.stdout.rows || 31) - 1, [])
  return (
      <Box flexDirection="column" width="100%" height={height}>
        <Header />
        <CommandInput>
          <Box flexGrow={1}>
            <Browser kind="providers" />
            {/* <Switch>
              <Route path="/bootstrap" component={BootstrapPage} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/dashboard/:menu" component={Dashboard} />
              <Route path="/" component={() => <Redirect to="/bootstrap" />} />
            </Switch> */}
          </Box>
        </CommandInput>
      </Box>
  )
}

export default Layout
