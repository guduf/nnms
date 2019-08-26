import React from 'react'

import { ApplicationContextProvider } from './context'
import Layout from './Layout'
import { createMemoryHistory, History } from 'history'
import { Router } from 'react-router'

export function NNMSUI(): React.ReactElement {
  const history = React.useMemo(() => createMemoryHistory() as History, [])
  return (
    <ApplicationContextProvider>
      <Router history={history}>
        <Layout />
      </Router>
    </ApplicationContextProvider>
  )
}

export default NNMSUI
