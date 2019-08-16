import { createContext, useContext, useEffect, useState } from 'react'
import { mergeMap, pairwise, startWith, distinctUntilChanged, takeUntil, share, skip } from 'rxjs/operators'
import { BehaviorSubject, of, fromEvent, Observable, EMPTY, timer } from 'rxjs'

export enum COMMAND_KEYS {
  ARROW_LEFT = 0x1b5b44,
  ARROW_RIGHT = 0x1b5b43,
  BACK = 0x7f,
  ENTER = 0x0d,
  TAB = 0x09
}

export function parseCommandKey(char: string): number {
  return parseInt(Buffer.from(char).toString('hex'), 16)
}

const {BACK, ENTER, TAB, ARROW_LEFT, ARROW_RIGHT} = COMMAND_KEYS

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

export const COMMAND_ACTIONS = {
  '←': ARROW_LEFT,
  '→': ARROW_RIGHT,
  'ENTER': ENTER
}

export const COMMAND_ACTION_LABELS = Object.keys(COMMAND_ACTIONS) as (keyof typeof COMMAND_ACTIONS)[]

export type CommandActionLabel = 'query' | (typeof COMMAND_ACTION_LABELS)[number]

export interface CommandInputState {
  readonly focus: string
  readonly query: string
  readonly flash: {
    zone: CommandActionLabel,
    kind: 'success' | 'error' | 'tap'
  } | null
}

export function handleQueryChange(
  entries: string[],
  {query, focus}: CommandInputState,
  char: string
): CommandInputState {
  const nextQuery = query + char
  if (focus.startsWith(nextQuery)) return {focus, query: nextQuery, flash: null}
  const nextFocus = entries.find(entry => entry.startsWith(nextQuery)) || ''
  return (
    nextFocus ?
     {focus: nextFocus, query: nextQuery, flash: {zone: 'query', kind: 'tap'}} :
     {focus, query, flash: {zone: 'query', kind: 'error'}}
  )
}

export function handleQuerySubmit(
  submitHandler: CommandInputHandler['onSubmit'],
  state: CommandInputState
): CommandInputState {
  if (state.focus && typeof submitHandler === 'function') {
    submitHandler(state.focus)
    return {focus: state.focus, query: state.focus, flash: {kind: 'success', zone: 'ENTER'}}
  }
  if (!state.focus) return {...state, flash: {kind: 'error', zone: 'ENTER'}}
  return state
}

export function handleQueryAutocomplete(
  entries: string[],
  state: CommandInputState
): CommandInputState {
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
  if (!suffix) return {...state, flash: {zone: 'query', kind: 'error'}}
  return {focus, query: query + suffix, flash: {zone: 'query', kind: 'tap'}}
}


export function handleQuerySwipe(
  entries: string[],
  state: CommandInputState,
  backward = false
): CommandInputState {
  const i = entries.indexOf(state.focus)
  const nextEntries =  (
    backward ?
      [...entries.slice(0, i).reverse(), ...entries.slice(i + 1).reverse()] :
      [...entries.slice(i + 1), ...entries.slice(0, i)]
  )
  const nextFocus = nextEntries.find(entry => entry.startsWith(state.query))
  if (!nextFocus) return {...state, flash: {kind: 'error', zone: backward ? '←' : '→'}}
  return {query: state.query, focus: nextFocus, flash: {kind: 'tap', zone: backward ? '←' : '→'}}
}

export function handleQueryDelete(
  entries: string[],
  {query}: CommandInputState
): CommandInputState {
  const nextQuery = query.slice(0, - 1)
  const nextFocus = entries.find(entry => entry.startsWith(nextQuery)) || ''
  return {query: nextQuery, focus: nextFocus, flash: null}
}

export function handleCommandPress(
  handler: CommandInputHandler,
  state: CommandInputState,
  char: string,
): CommandInputState {
  const code = parseCommandKey(char)
  switch (code) {
    case ARROW_LEFT:
    case ARROW_RIGHT:
      return handleQuerySwipe(handler.entries, state, code === ARROW_LEFT)
    case BACK: return handleQueryDelete(handler.entries, state)
    case ENTER: return handleQuerySubmit(handler.onSubmit, state)
    case TAB: return handleQueryAutocomplete(handler.entries, state)
    default: return handleQueryChange(handler.entries, state, char)
  }
}

export function attachHandler(
  stdin: NodeJS.ReadStream,
  handler: CommandInputHandler,
  onFocus?: (entry: string) => void
): Observable<CommandInputState> {
  let state: CommandInputState = {focus: handler.entries[0], query: '', flash: null}
  return fromEvent<string>(stdin, 'data').pipe(
    mergeMap(char => {
      const next = handleCommandPress(handler, {...state}, char)
      if (next === state) return EMPTY
      if (next.focus !== state.focus && typeof onFocus === 'function') onFocus(next.focus)
      const prev = {...state}
      state = next
      if (next.flash && next.flash !== prev.flash) {
        return timer(next.flash.kind === 'tap' ?  120 : 240).pipe(
          mergeMap(() => (next.flash !== prev.flash ? of({...next, flash: null}) : EMPTY)),
          startWith(next)
        )
      }
      if (JSON.stringify(next) === JSON.stringify(prev)) return EMPTY
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
    )),
    share()
  )
  const nextHandler = (handler: CommandInputHandler | null): Observable<CommandInputState> => {
    handlerChange.next(handler)
    if (!handler) return EMPTY
    return stateChange.pipe(takeUntil(handlerChange.pipe(skip(1))))
  }
  return {stateChange, nextHandler}
}
