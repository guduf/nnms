import React from 'react'

import { Observable } from 'rxjs'

import { LoggerEvent, getApplicationContext, ApplicationState } from 'nnms'

import SubjectTransport from '../subject_transport'

interface NNMSContext extends ApplicationState {
  events: Observable<LoggerEvent>
}

export const NNMSContext = React.createContext(undefined as unknown as NNMSContext)

export function NNMSProvider({children}: { children: React.ReactNode }) {
  const {ctx, events} = React.useMemo(() => {
    const ctx = getApplicationContext()
    const subjectTransport = ctx.loggerTransports[0]
    if (!(subjectTransport instanceof SubjectTransport)) throw new Error('invalid transport')
    return {ctx, events: subjectTransport.events}
  }, [])
  const [hook, setHook] = React.useState({...ctx.state, events})
  React.useEffect(() => {
    const subscr = ctx.stateChanges.subscribe(state => setHook({...state, events}))
    return () => subscr.unsubscribe()
  }, [ctx])
  return <NNMSContext.Provider value={hook} children={children} />
}

export function useNNMS(): NNMSContext {
  return React.useContext(NNMSContext)
}

export interface RouterState {
  path: string
}
