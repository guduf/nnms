import { createContext, ReactNode, createElement, useContext, ReactElement } from 'react'

import { LogStore } from '../log_store';

export const LogStoreContext = createContext(undefined as unknown as LogStore)

export function LogStoreProvider(
  {children, value}: { value: LogStore, children: ReactNode }
): ReactElement {
  return createElement(LogStoreContext.Provider,  {value, children})
}

export function useLogStore(): LogStore {
  return useContext(LogStoreContext)
}
