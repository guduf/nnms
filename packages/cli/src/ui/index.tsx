import React from 'react'

import { NNMSProvider } from './context'
import Layout from './Layout'
import { createMemoryHistory, History } from 'history'
import { Router } from 'react-router'

export function NNMSUI(): React.ReactElement {
  const history = React.useMemo(() => createMemoryHistory() as History, [])
  return (
    <NNMSProvider>
      <Router history={history}>
        <Layout />
      </Router>
    </NNMSProvider>
  )
}

export default NNMSUI
