import * as React from 'react'

import BorderBox from './BorderBox'
import { Box, Color, Text, StdinContext } from 'ink'
import { createCommandState, CommandInputState, NextCommandHandler, CommandActionLabel, COMMAND_ACTION_LABELS } from './command'
import { filelog } from './util';

export function useCommandState(): {state: CommandInputState, nextHandler: NextCommandHandler } {
  const [state, setState] = React.useState<CommandInputState>({query: '', focus: '', flash: null})
  const {stdin, setRawMode} = React.useContext(StdinContext)
  const {stateChange, nextHandler} = React.useMemo(() => createCommandState(setRawMode, stdin), [])
  React.useEffect(() => {
    const subscr = stateChange.subscribe(setState)
    return () => subscr.unsubscribe()
  }, [stateChange])
  return {state, nextHandler}
}

const getColor = (flash: CommandInputState['flash'], label: CommandActionLabel): string => {
  switch (flash && flash.zone === label && flash.kind) {
    case 'error': return 'red'
    case 'success': return 'green'
    case 'tap': return 'yellow'
    default: return 'grey'
  }
}
export function CommandInput({children}: { children: React.ReactNode }) {
  const {state: {query, focus, flash}, nextHandler} = useCommandState()
  const colors = React.useMemo(() => {
    const colors = {
      query: getColor(flash, 'query'),
      commands: COMMAND_ACTION_LABELS.map(label => getColor(flash, label))
    }
    filelog({flash, colors})
    return colors
  }, [flash])
  return (
    <NextCommandHandler.Provider value={nextHandler}>
      <Box flexDirection="column" flexGrow={1} justifyContent="flex-start">
        {children}
        <Box flexDirection="row" width="100%" height={3} paddingX={1}>
          <BorderBox color={colors.query} justifyContent="space-between">
            <Box>
              <Text>{query}</Text>
              <Color grey>{focus.slice(query.length)}</Color>
            </Box>
            <Text>Type or use arrows</Text>
          </BorderBox>
          {COMMAND_ACTION_LABELS.map((label, i) => (
            <Box key={label} flexShrink={i === 1 ? 1 : 0} flexBasis={4 + label.length + (i === 1 ? 1 : 0)}>
              <BorderBox color={colors.commands[i]} fixedWidth={4 + label.length} key={label}>
                <Color keyword={colors.commands[i]}>{label}</Color>
              </BorderBox>
            </Box>
          ))}
        </Box>
      </Box>
    </NextCommandHandler.Provider>
  )
}

export default CommandInput
