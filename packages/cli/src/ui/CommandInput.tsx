import * as React from 'react'

import TextInput from 'ink-text-input'
import { Box, Color } from 'ink'
import { filelog } from './util';

export type CommandInputArrows =  'top' | 'left' | 'bottom' | 'right'

export interface CommandInputHandler<T extends string[] = string[]> {
  entries: T
  arrows: { [P in CommandInputArrows]?: () => void }
  onFocus?: (entry: T[number]) => void
  onSubmit?: (entry: T[number]) => void
}

export interface CommandInputContext {
  (handler: CommandInputHandler): () => void
}

const CommandInputContext = React.createContext(undefined as never as CommandInputContext)

export function useCommandInput(effect: () => CommandInputHandler, deps: any[]): void {
  const attachHandler = React.useContext(CommandInputContext)
  React.useEffect(() => attachHandler(effect()), deps)
}

export function CommandInput({children}: { children: React.ReactNode }) {
  const [{query, focus}, setState] = React.useState({query: '', focus: ''})
  filelog({query, focus})
  const {attachHandler, handleInputChange} = React.useMemo(() => {
    let activeHandler =  null as CommandInputHandler | null
    const handleInputChange = (nextQuery: string): void => {
      if (!activeHandler) return
      if (focus.startsWith(nextQuery)) return setState({focus, query: nextQuery})
      const nextFocus = activeHandler.entries.find(entry => entry.startsWith(nextQuery)) || ''
      if (nextFocus) {
        if (typeof activeHandler.onFocus === 'function') activeHandler.onFocus(nextFocus)
        return setState({focus: nextFocus, query: nextQuery})
      }
    }
    const attachHandler: CommandInputContext = (handler: CommandInputHandler) => {
      if (activeHandler) throw new Error('handler is already attached')
      activeHandler = handler
      setState({query: '', focus: activeHandler.entries[0]})
      return () => activeHandler = null
    }
    return {attachHandler, handleInputChange}
  }, [])
  return (
    <CommandInputContext.Provider value={attachHandler}>
      <Box flexDirection="column" flexGrow={1}>
        {children}
        <Box flexGrow={1} height={1} padding={1}>
          <TextInput
            placeholder="Start typing"
            value={query}
            onChange={handleInputChange}
            showCursor={false}/>
            <Color grey>{focus}</Color>
        </Box>
      </Box>
    </CommandInputContext.Provider>
  )
}

export default CommandInput
