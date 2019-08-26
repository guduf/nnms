import React from 'react'

import { getContainerContext, ApplicationContext } from 'nnms'

export const _ApplicationContext = React.createContext(undefined as unknown as ApplicationContext)

export function ApplicationContextProvider({children}: { children: React.ReactNode }) {
  const ctx = React.useMemo(() => getContainerContext(), [])
  return <_ApplicationContext.Provider value={ctx} children={children} />
}

export function useApplicationContext(): ApplicationContext {
  return React.useContext(_ApplicationContext)
}
