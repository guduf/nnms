import * as React from 'react'

import { BrowserRouter, Switch, Route } from 'react-router-dom'

import AppLayout from './AppLayout'
import { ApiProvider } from './api/context'

const API_URL = 'ws://localhost:9063'

export const LocaleContext = React.createContext<{ [key: string]: string }>({})

export function App(): React.ReactElement {
  return (
    <ApiProvider url={API_URL}>
      <BrowserRouter>
        <Switch>
          <Route path='/' component={AppLayout}></Route>
        </Switch>
      </BrowserRouter>
    </ApiProvider>
  )
}

export default App
