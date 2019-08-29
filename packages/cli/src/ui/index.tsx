import React from 'react'

import { LogStoreProvider } from './log_store'
import Layout from './Layout'
import { createMemoryHistory, History } from 'history'
import { Router } from 'react-router'
import { LogStore } from '../log_store'

export interface NNMSUIProps {
  logStore: LogStore
}

export function NNMSUI({logStore}: NNMSUIProps): React.ReactElement {
  const history = React.useMemo(() => createMemoryHistory() as History, [])
  return (
    <LogStoreProvider value={logStore}>
      <Router history={history}>
        <Layout />
      </Router>
    </LogStoreProvider>
  )
}

export default NNMSUI
