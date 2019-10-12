import { createContext, ReactNode, createElement, useContext, ReactElement, useMemo } from 'react'

import { Observable } from 'rxjs'

import { getContainerContext, LoggerMetricValue } from 'nnms'

import { LogStore,  } from '../log_store'

export interface LogContext {
  readonly store: LogStore,
  readonly appMetrics: Observable<AppMetrics>
}

export const LogContext = createContext(undefined as never as LogContext)

export interface AppMetrics {
  [key: string]: LoggerMetricValue

  modules: { name: string, status: 'bootstrap' | 'ready', plugins: string }[]
  providers: { name: string, status: 'bootstrap' | 'ready' }[]
  plugins: { name: string, plugin: string, module: string }[]
}

export function LogProvider(
  {children, store}: { store: LogStore, children: ReactNode }
): ReactElement {
  const appMetrics = useMemo(() => (
    store.getMetrics<AppMetrics>('app', getContainerContext().name)
  ), [store])
  return createElement(LogContext.Provider, {value: {store, appMetrics}, children})
}

export function useLog(): LogContext {
  return useContext(LogContext)
}
