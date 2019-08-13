import React from 'react'

import { Observable, of, EMPTY } from 'rxjs'

import { LoggerEvent } from 'nnms'

import SubjectTransport from '../subject_transport'
import { shareReplay } from 'rxjs/operators';

export interface NNMSModuleContext {
  init: boolean
  plugins: { [name: string]: { init: boolean } }
}

export interface NNMSContext {
  mods: Observable<{ [name: string]: NNMSModuleContext }>
  providers: Observable<{ [name: string]: boolean }>
  events: Observable<LoggerEvent>
}

export const NNMSContext = React.createContext(undefined as unknown as NNMSContext)

export interface NNMSContextProviderProps {
  transport: SubjectTransport
  children: React.ReactNode
}

export function NNMSContextProvider({children, transport}: NNMSContextProviderProps) {
  const context = React.useMemo(() => {
    const events = transport.events.pipe(shareReplay())
    events.subscribe()
    return {
      mods: of({todo: {init: true, plugins: {}}}),
      providers: of({}),
      events: events
    } as NNMSContext
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
