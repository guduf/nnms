import * as React from 'react'

import BorderBox from './BorderBox'
import { Box, Color, Text, StdinContext } from 'ink'
import { filelog } from './util'
import { createCommandState, CommandInputState, NextCommandHandler } from './command'

export function useCommandState(): {state: CommandInputState, nextHandler: NextCommandHandler } {
  const [state, setState] = React.useState({query: '', focus: ''} as CommandInputState)
  const {stdin, setRawMode} = React.useContext(StdinContext)
  const {stateChange, nextHandler} = React.useMemo(() => createCommandState(setRawMode, stdin), [])
  React.useEffect(() => {
    const subscr = stateChange.subscribe(setState)
    return () => subscr.unsubscribe()
  }, [stateChange])
  return {state, nextHandler}
}

export function CommandInput({children}: { children: React.ReactNode }) {
  const {state: {query, focus}, nextHandler} = useCommandState()
  filelog({query, focus})
  return (
    <NextCommandHandler.Provider value={nextHandler}>
      <Box flexDirection="column" flexGrow={1} justifyContent="flex-start">
        {children}
        <Box flexDirection="row" width="100%" height={3}>
          <BorderBox color="yellow"  justifyContent="space-between">
            <Box>
              <Text>{query}</Text>
              <Color grey>{focus.slice(query.length)}</Color>
            </Box>
            <Text>Type or use arrows</Text>
          </BorderBox>
        </Box>
      </Box>
    </NextCommandHandler.Provider>
  )
}

export default CommandInput
