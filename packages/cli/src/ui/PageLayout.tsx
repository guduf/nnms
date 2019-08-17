import * as React from 'react'
import { RouteComponentProps } from 'react-router'
import { CommandInputState, useCommandInput } from './command'
import { Box } from 'ink'

export interface PageLayoutConfig {
  commandStateDistinctUntilChanged?: (keyof CommandInputState)[]
}

const COMMAND_MODES = {
  'text': {prefix: '', color: 'white'},
  'path': {prefix: '/', color: 'cyan'},
  'relpath': {prefix: './', color: 'cyan'},
  'search': {prefix: '?', color: 'magenta'}
} as const

export type CommandMode = keyof typeof COMMAND_MODES

export function PageLayout(
  props: PageLayoutConfig & { route: RouteComponentProps<{ id?: string }> }
): React.ReactElement {
  const [{commandMode, entries}, setState] = React.useState({
    commandMode: 'text' as CommandMode,
    entries: [] as string[] | RegExp
  })
  const opts = React.useMemo(() => {
    const commandInput = {
      distinctUntilChanged: props.commandStateDistinctUntilChanged
    }
    return {commandInput}
  }, [commandMode])
  const state = useCommandInput(() => {
    const onPress = (char: string, {query}: CommandInputState): boolean => {
      if (!['.', '/', '?'].includes(char) || query.length) return false
      const mode: CommandMode = char === '.' ? 'relpath' : char === '/' ? 'path' : 'search'
      setState({entries, commandMode: mode})
      return true
    }
    const {color, prefix} = COMMAND_MODES[commandMode]
    return {entries, onPress, color, prefix}
  }, opts.commandInput, [commandMode])
  return (
    <Box flexDirection="column">
    <Box>{JSON.stringify(commandMode)}</Box>
    <Box>{JSON.stringify(props.route.location)}</Box>
      <Box>{JSON.stringify(state)}</Box>
    </Box>
  )
}

export default PageLayout
