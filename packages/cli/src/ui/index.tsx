import React from 'react'

import { LogProvider } from './log_context'
import Layout from './Layout'
import { MemoryHistory } from 'history'
import { Router } from 'react-router'
import { LogStore } from '../log_store'

export interface NNMSUIProps {
  logStore: LogStore
  history: MemoryHistory
}

export function NNMSUI({logStore, history}: NNMSUIProps): React.ReactElement {
  return (
    <LogProvider store={logStore}>
      <Router history={history}>
        <Layout />
      </Router>
    </LogProvider>
  )
}

export default NNMSUI

/*
  const logStore = new LogStore(events)
  const history = createMemoryHistory(
    cmd.path ? {initialEntries: [cmd.path]} : {}
  )
  render(createElement(NNMSUI, {history, logStore}))
*/
