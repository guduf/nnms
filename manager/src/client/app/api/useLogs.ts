import { LogRecord } from '~shared/log_record'
import { useApi } from './context'
import { useState } from 'react'
import { useEffect } from 'react'

export interface LogQueryState {
  loading: boolean
  data: LogRecord[] | null
  err: string | null
}

const INITIAL_QUERY: LogQueryState = {
  loading: true,
  data: null,
  err: null
}

export function useLogQuery(): LogQueryState {
  const api = useApi()
  const [state, setState] = useState(INITIAL_QUERY)
  useEffect(() => {
    const subscr = api<LogRecord[]>({method: 'GET_LOG', body: {}}).subscribe(
      data => setState({loading: false, data, err: null})
    )
    return subscr.unsubscribe()
  }, [])
  return state
}
