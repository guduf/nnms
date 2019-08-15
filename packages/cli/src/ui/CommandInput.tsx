import * as React from 'react'

import { Box, Color, StdinContext, Text } from 'ink'
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
      <Box flexDirection="column" flexGrow={1}>
        {children}
        <Box flexGrow={1} height={1} padding={1}>
          <Text>{query}</Text>
          <Color grey>{focus.slice(query.length)}</Color>
        </Box>
      </Box>
    </NextCommandHandler.Provider>
  )
}

export default CommandInput
