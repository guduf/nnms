import React from 'react'

import { History, createMemoryHistory } from 'history'
import { Router } from 'react-router'

export const HistoryContext = React.createContext(undefined as unknown as History)

export function HistoryProvider({children}: { children: React.ReactNode }): React.ReactElement {
  const history = createMemoryHistory() as History
  return (
    <HistoryContext.Provider value={history}>
      <Router history={history}>{children}</Router>
    </HistoryContext.Provider>
  )
}

export function useHistory(): History {
  return React.useContext(HistoryContext)
}
