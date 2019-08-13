import React from 'react'

import { Observable, EMPTY } from 'rxjs'

import { LoggerEvent, ApplicationBackground, getApplicationContext } from 'nnms'

import SubjectTransport from '../subject_transport'

export interface NNMSModuleContext {
  init: boolean
  plugins: { [name: string]: { init: boolean } }
}

export interface NNMSContext {
  background: ApplicationBackground
  events: Observable<LoggerEvent>
}

export const NNMSContext = React.createContext(undefined as unknown as NNMSContext)

export interface NNMSContextProviderProps {
  transport: SubjectTransport
  children: React.ReactNode
}

export function NNMSContextProvider({children, transport}: NNMSContextProviderProps) {
  const context = React.useMemo(() => {
    const events = transport.events
    const ctx = getApplicationContext()
    events.subscribe()
    return {background: ctx.background, events}
  }, [])
  return <NNMSContext.Provider value={context} children={children} />
}

export interface LoggerEventFilter {
  name: string
}

export function useNNMSContext(): NNMSContext {
  const ctx = React.useContext(NNMSContext)
  return ctx || { mods: EMPTY, providers: EMPTY, events: EMPTY}
}
