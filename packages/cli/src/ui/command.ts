import { createContext, useContext, useEffect, useState } from 'react'
import { mergeMap, pairwise, startWith, distinctUntilChanged, takeUntil, share, tap, skip, map } from 'rxjs/operators'
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
  onSubmit?: (entry: T[number]) => void
}

export interface NextCommandHandler {
  (handler: CommandInputHandler | null): Observable<CommandInputState>
}

export const NextCommandHandler = createContext(undefined as never as NextCommandHandler)

export function useCommandInput(
  effect: () => CommandInputHandler,
  deps: any[]
): { focus: string, query: string } {
  const [state, setState] = useState({focus: '', query: ''})
  const attachHandler = useContext(NextCommandHandler)
  useEffect(() => {
    const handler = effect()
    const subscr = attachHandler(handler).subscribe(({focus, query}) => setState({focus, query}))
    setState({focus: handler.entries[0], query: ''})
    return () => {
      subscr.unsubscribe()
      attachHandler(null)
    }
  }, deps)
  return state
}

export interface CommandInputRawState {
  readonly focus: string
  readonly query: string
  readonly flash: { kind: 'success' | 'error' } | null
}
export interface CommandInputState {
  readonly focus: string
  readonly query: string
  readonly flash: 'success' | 'error' | null
}

export function handleQueryChange(
  entries: string[],
  {query, focus}: CommandInputRawState,
  char: string
): CommandInputRawState {
  const nextQuery = query + char
  if (focus.startsWith(nextQuery)) return {focus, query: nextQuery, flash: null}
  const nextFocus = entries.find(entry => entry.startsWith(nextQuery)) || ''
  return (
    nextFocus ?
     {focus: nextFocus, query: nextQuery, flash: null} :
     {focus, query, flash: {kind: 'error'}}
  )
}

export function handleQuerySubmit(
  submitHandler: CommandInputHandler['onSubmit'],
  state: CommandInputRawState
): CommandInputRawState {
  if (state.focus && typeof submitHandler === 'function') {
    submitHandler(state.focus)
    return {focus: state.focus, query: state.focus, flash: {kind: 'success'}}
  }
  if (!state.focus) return {...state, flash: {kind: 'error'}}
  return state
}

export function handleQuerySwipe(
  entries: string[],
  state: CommandInputRawState
): CommandInputRawState {
  const {query} = state
  let [suffix, focus] = ['', state.focus]
  for (const entry of entries) {
    if (!entry.startsWith(query)) continue
    if (!suffix) {
      suffix = entry.slice(query.length)
      focus = entry
      continue
    }
    if (entry.slice(query.length).startsWith(suffix)) continue
    const separator = Array.from({length: suffix.length}, (_, i) => i).find(i => {
      return suffix[i] !== entry[query.length + i]
    })
    if (!separator) {
      suffix = ''
      break
    }
    suffix = suffix.slice(0, separator)
  }
  if (!suffix) return {...state, flash: {kind: 'error'}}
  return {focus, query: query + suffix, flash: null}
}


export function handleQueryDelete(
  entries: string[],
  {query}: CommandInputRawState
): CommandInputRawState {
  const nextQuery = query.slice(0, - 1)
  const nextFocus = entries.find(entry => entry.startsWith(nextQuery)) || ''
  return {query: nextQuery, focus: nextFocus, flash: null}
}

export function handleCommandPress(
  handler: CommandInputHandler,
  state: CommandInputRawState,
  char: string,
): CommandInputRawState {
  const code = char.charCodeAt(0) as COMMAND_CODE
  switch (code) {
    case BACK: return handleQueryDelete(handler.entries, state)
    case ENTER: return handleQuerySubmit(handler.onSubmit, state)
    case TAB: return handleQuerySwipe(handler.entries, state)
    default: return handleQueryChange(handler.entries, state, char)
  }
}

export function attachHandler(
  stdin: NodeJS.ReadStream,
  handler: CommandInputHandler,
  onFocus?: (entry: string) => void
): Observable<CommandInputState> {
  let state: CommandInputRawState = {focus: handler.entries[0], query: '', flash: null}
  return fromEvent<string>(stdin, 'data').pipe(
    mergeMap(char => {
      const next = handleCommandPress(handler, {...state}, char)
      if (next === state) return EMPTY
      if (next.focus !== state.focus && typeof onFocus === 'function') onFocus(next.focus)
      const prev = {...state}
      state = next
      if (next.flash && next.flash !== prev.flash) {
        return timer(240).pipe(
          mergeMap(() => (next.flash !== prev.flash ? of({...next, flash: null}) : EMPTY)),
          startWith(next)
        )
      }
      if (JSON.stringify(next) === JSON.stringify(prev)) return EMPTY
      return of(next)
    }),
    startWith(state),
    tap(e => filelog({e})),
    map(({flash, focus, query}) => ({flash : flash ? flash.kind : null, focus, query})),
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
    )),
    share()
  )
  const nextHandler = (handler: CommandInputHandler | null): Observable<CommandInputState> => {
    handlerChange.next(handler)
    if (!handler) return EMPTY
    return stateChange.pipe(takeUntil(handlerChange.pipe(skip(1))), tap(e => filelog(e)))
  }
  return {stateChange, nextHandler}
}
