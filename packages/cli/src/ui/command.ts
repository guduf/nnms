import { createContext, useContext, useEffect } from 'react'
import { mergeMap, pairwise, startWith, distinctUntilChanged } from 'rxjs/operators'
import { BehaviorSubject, of, fromEvent, Observable, EMPTY, timer } from 'rxjs'
import { filelog } from './util';

export enum COMMAND_CODE {
  BACK = 127,
  ENTER = 13,
  TAB = 9
}

const {BACK, ENTER, TAB} = COMMAND_CODE

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
    attachHandler(effect())
    return () => attachHandler(null)
  }, deps)
}

export interface CommandInputState {
  focus: string
  query: string
  flash: { kind: 'success' | 'error' } | null
}

export function handleQueryChange(
  entries: string[],
  focusHandler: CommandInputHandler['onFocus'],
  {query, focus}: CommandInputState,
  char: string
): CommandInputState {
  const nextQuery = query + char
  if (focus.startsWith(nextQuery)) return {focus, query: nextQuery, flash: null}
  const nextFocus = entries.find(entry => entry.startsWith(nextQuery)) || ''
  if (typeof focusHandler === 'function') focusHandler(nextFocus)
  return (
    nextFocus ?
     {focus: nextFocus, query: nextQuery, flash: null} :
     {focus, query, flash: {kind: 'error'}}
  )
}

export function handleQuerySubmit(
  submitHandler: CommandInputHandler['onSubmit'],
  state: CommandInputState
): CommandInputState {
  if (state.focus === state.query && typeof submitHandler === 'function') {
    submitHandler(state.focus)
    return {...state, flash: {kind: 'success'}}
  }
  if (state.focus !== state.query) return {...state, flash: {kind: 'error'}}
  return state
}

export function handleCommandPress(
  handler: CommandInputHandler,
  state: CommandInputState,
  char: string
): CommandInputState {
  const code = char.charCodeAt(0) as COMMAND_CODE
  const {focus, query} = state
  switch (code) {
    case BACK: return {focus, query: query.slice(0, - 1), flash: null}
    case ENTER: return handleQuerySubmit(handler.onSubmit, {...state})
    case TAB: return {focus, query: focus, flash: null}
    default: return handleQueryChange(handler.entries, handler.onSubmit, {...state}, char)
  }
}

export function attachHandler(
  stdin: NodeJS.ReadStream,
  handler: CommandInputHandler
): Observable<CommandInputState> {
  let state: CommandInputState = {focus: handler.entries[0], query: '', flash: null}
  return fromEvent<string>(stdin, 'data').pipe(
    mergeMap(char => {
      const next = handleCommandPress(handler, {...state}, char)
      if (next === state) return EMPTY
      const prevFlash = state.flash
      state = next
      if (next.flash && next.flash !== prevFlash) {
        filelog(['av', next.flash, next.flash !== prevFlash,  prevFlash])
        return timer(240).pipe(
          mergeMap(() => { filelog(['ap', next.flash, next.flash !== prevFlash,  prevFlash]); return (
            next.flash !== prevFlash ? of({...state, flash: null}) : EMPTY
          )}),
          startWith(next)
        )
      }
      return of(next)
    }),
    startWith(state)
  )
}

export function createCommandState(
  setRawMode: NodeJS.ReadStream["setRawMode"],
  stdin: NodeJS.ReadStream
): { stateChange: Observable<CommandInputState>, nextHandler: NextCommandHandler } {
  if (typeof setRawMode !== 'function') throw new Error('setRawMode is not a function')
  const handlerChange = new BehaviorSubject<CommandInputHandler | null>(null)
  const stateChange = handlerChange.pipe(
    startWith(null),
    pairwise(),
    mergeMap(([prev, next]) => {
      if (!next) {
        if (prev) setRawMode(false)
        return of({query: '', focus: '', flash: null})
      }
      if (!prev) setRawMode(true)
      return attachHandler(stdin, next)
    }),
    distinctUntilChanged((prev, next) => (
      prev === next || (JSON.stringify(prev) === JSON.stringify(next))
    ))
  )
  return {stateChange, nextHandler: nextHandler => handlerChange.next(nextHandler)}
}
