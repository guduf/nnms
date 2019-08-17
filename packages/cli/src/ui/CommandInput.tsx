import * as React from 'react'

import BorderBox from './BorderBox'
import { Box, Color, Text, StdinContext } from 'ink'
import { createCommandState, CommandInputState, NextCommandHandler, CommandActionLabel, COMMAND_ACTION_LABELS } from './command'
import { combineLatest } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

export function useCommandState(): {state: CommandInputState & { color: string, prefix: string }, nextHandler: NextCommandHandler } {
  const [state, setState] = React.useState<CommandInputState & { color: string, prefix: string }>({
    color: 'white',
    prefix: '',
    query: '',
    focus: '',
    flash: null
  })
  const {stdin, setRawMode} = React.useContext(StdinContext)
  const {stateChange, handlerChange, nextHandler} = React.useMemo(() => createCommandState(setRawMode, stdin), [])
  React.useEffect(() => {
    const styleObs =  handlerChange.pipe(
      map(handler => ({
        color: handler && handler.color || 'white',
        prefix: handler && handler.prefix || ''
      })),
      distinctUntilChanged((x, y) => `${x.color},${x.prefix}` === `${y.color},${y.prefix}`)
    )
    const subscr = combineLatest(stateChange, styleObs)
      .pipe(
        map(([state, {color, prefix}]) => ({...state, color, prefix})),
      )
      .subscribe(setState)
    return () => subscr.unsubscribe()
  }, [])
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
  const {state: {query, focus, flash, color, prefix}, nextHandler} = useCommandState()
  const colors = React.useMemo(() => {
    const colors = {
      query: getColor(flash, 'query'),
      commands: COMMAND_ACTION_LABELS.map(label => getColor(flash, label))
    }
    return colors
  }, [flash])
  return (
    <NextCommandHandler.Provider value={nextHandler}>
      <Box flexDirection="column" flexGrow={1} justifyContent="flex-start">
        {children}
        <Box flexDirection="row" width="100%" height={3} paddingX={1}>
          <BorderBox color={colors.query} justifyContent="space-between">
            <Box>
              <Color keyword={color}>{prefix}{query}</Color>
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
