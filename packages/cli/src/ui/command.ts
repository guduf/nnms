import { createContext, useContext, useEffect } from 'react'
import { mergeMap, pairwise, startWith } from 'rxjs/operators'
import { Subject, of, fromEvent, Observable, EMPTY } from 'rxjs'


export enum COMMAND_CODE {
  TAB = 9,
  BACK = 127
}

export type CommandInputArrows =  'top' | 'left' | 'bottom' | 'right'

export interface CommandInputHandler<T extends string[] = string[]> {
  entries: T
  arrows?: { [P in CommandInputArrows]?: () => void }
  onFocus?: (entry: T[number]) => void
  onSubmit?: (entry: T[number]) => void
}

export interface NextCommandHandler {
  (handler: CommandInputHandler | null): void
}

export const NextCommandHandler = createContext(undefined as never as NextCommandHandler)

export function useCommandInput(effect: () => CommandInputHandler, deps: any[]): void {
  const attachHandler = useContext(NextCommandHandler)
  useEffect(() => {
    setTimeout(() => attachHandler(effect()), 0)
    return () => { setTimeout(() => attachHandler(effect()), 0) }
  }, deps)
}

export interface CommandInputState {
  query: string
  focus: string
}

export function handleQueryChange(
  entries: string[],
  {query, focus}: CommandInputState,
  char: string
): CommandInputState {
  const nextQuery = query + char
  if (focus.startsWith(nextQuery)) return {focus, query: nextQuery}
  const nextFocus = entries.find(entry => entry.startsWith(nextQuery)) || ''
  return nextFocus ? {focus: nextFocus, query: nextQuery} : {focus, query}
}

export function handleCommandPress(
  handler: CommandInputHandler,
  state: CommandInputState,
  char: string
): CommandInputState {
  const code = char.charCodeAt(0) as COMMAND_CODE
  switch (code) {
    case COMMAND_CODE.BACK: return {focus: state.focus, query: state.query.slice(0, - 1)}
    case COMMAND_CODE.TAB: return {focus: state.focus, query: state.focus}
    default: return handleQueryChange(handler.entries, state, char)
  }
}

export function attachHandler(
  stdin: NodeJS.ReadStream,
  handler: CommandInputHandler
): Observable<CommandInputState> {
  let state = {focus: handler.entries[0], query: ''} as CommandInputState
  return fromEvent<string>(stdin, 'data').pipe(
    mergeMap(char => {
      const next = handleCommandPress(handler, state, char)
      if (next === state) return EMPTY
      state = next
      return of(next)
    }),
    startWith(state)
  )
}

export function createCommandState(
  setRawMode: NodeJS.ReadStream["setRawMode"],
  stdin: NodeJS.ReadStream
): { stateChange: Observable<CommandInputState>, nextHandler: NextCommandHandler} {
  if (typeof setRawMode !== 'function') throw new Error('setRawMode is not a function')
  const handlerChange = new Subject<CommandInputHandler | null>()
  const stateChange = handlerChange.pipe(
    startWith(null),
    pairwise(),
    mergeMap(([prev, next]) => {
      if (!next) {
        if (prev) setRawMode(false)
        return of({query: '', focus: ''})
      }
      if (!prev) setRawMode(true)
      return attachHandler(stdin, next)
    })
  )
  return {stateChange, nextHandler: nextHandler => handlerChange.next(nextHandler)}
}
