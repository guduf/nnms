import React from 'react'
import { ApiClient } from './client'
import { throwError } from 'rxjs'
import { ApiRequest } from '~shared/api'


export const API_CONTEXT = React.createContext<ApiClient['request']>(
  () => throwError('missing ApiProvider')
)

export function ApiProvider({url, children}: { url: string, children: React.ReactNode }) {
  const value = React.useMemo(() => {
    const ws = new WebSocket(url)
    const client = new ApiClient(ws)
    return ((input: Omit<ApiRequest, 'id'>) => client.request(input)) as ApiClient['request']
  }, [])
  return <API_CONTEXT.Provider {...{value, children}} />
}

export function useApi(): ApiClient['request'] {
  return React.useContext(API_CONTEXT)
}
