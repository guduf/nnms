import { createContext, useContext, useEffect, useState } from 'react'
import { mergeMap, startWith, distinctUntilChanged, takeUntil, share, skip, map, distinctUntilKeyChanged } from 'rxjs/operators'
import { BehaviorSubject, of, fromEvent, Observable, EMPTY, timer, combineLatest } from 'rxjs'

export enum COMMAND_KEYS {
  ARROW_LEFT = 0x1b5b44,
  ARROW_RIGHT = 0x1b5b43,
  BACK = 0x7f,
  ENTER = 0x0d,
  TAB = 0x09
}

export enum PREFIX_KEYS {
  SEARCH = 0x3f,
  RELPATH = 0x2e,
  PATH = 0x2f
}

export function parseCommandKey(char: string): number {
  return parseInt(Buffer.from(char).toString('hex'), 16)
}

const {BACK, ENTER, TAB, ARROW_LEFT, ARROW_RIGHT} = COMMAND_KEYS

export type CommandInputArrows =  'top' | 'left' | 'bottom' | 'right'

export interface CommandInputHandler<T extends string[] | RegExp = string[] | RegExp> {
  entries: T
  prefix?: string
  color?: string
  onPress?: (char: string, prevState: CommandInputState) => boolean
  onSubmit?: (entry: T extends string[] ? T[number] : string) => boolean
}

export interface NextCommandHandler {
  (handler: CommandInputHandler | null): Observable<CommandInputState>
}

export const NextCommandHandler = createContext(undefined as never as NextCommandHandler)

export function useCommandInput(
  effect: () => CommandInputHandler | null,
  opts: { distinctUntilChanged?: (keyof CommandInputState)[] } = {},
  deps: any[]
): CommandInputState {
  const [state, setState] = useState<CommandInputState>({flash: null, focus: '', query: ''})
  const attachHandler = useContext(NextCommandHandler)
  useEffect(() => {
    const handler = effect()
    if (!handler) {
      attachHandler(null)
      return
    }
    const subscr = attachHandler(handler)
      .pipe(distinctUntilChanged((x, y) => {
        for (const key of opts.distinctUntilChanged || []) if (x[key] !== y[key]) return false
        return true
      }))
      .subscribe(state => setState(state))
    setState({flash: null, focus: '', query: ''})
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
  entries: string[] | RegExp,
  {query, focus}: CommandInputState,
  char: string
): CommandInputState {
  const nextQuery = query + char
  if (entries instanceof RegExp) {
    const nextFlash = entries.test(nextQuery) ? null : {zone: 'query', kind: 'error'} as const
    return {flash: nextFlash, focus, query: nextQuery}
  }
  if (focus.startsWith(nextQuery)) return { flash: null, focus, query: nextQuery}
  const nextFocus = entries.find(entry => entry.startsWith(nextQuery)) || ''
  return (
    nextFocus ?
     {flash: {zone: 'query', kind: 'tap'}, focus: nextFocus, query: nextQuery} :
     {flash: {zone: 'query', kind: 'error'}, focus, query}
  )
}

export function handleQuerySubmit(
  submitHandler: CommandInputHandler['onSubmit'],
  state: CommandInputState
): CommandInputState {
  if (state.focus && typeof submitHandler === 'function') {
    submitHandler(state.focus)
    return {flash: {kind: 'success', zone: 'ENTER'}, focus: state.focus, query: state.focus}
  }
  if (!state.focus) return {...state, flash: {kind: 'error', zone: 'ENTER'}}
  return state
}

export function handleQueryAutocomplete(
  entries: string[] | RegExp,
  state: CommandInputState
): CommandInputState {
  if (entries instanceof RegExp) return state
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
  entries: string[] | RegExp,
  state: CommandInputState,
  backward = false
): CommandInputState {
  if (entries instanceof RegExp) return state
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
  entries: string[] | RegExp,
  state: CommandInputState
): CommandInputState {
  const nextQuery = state.query.slice(0, - 1)
  if (entries instanceof RegExp) {
    if (!entries.test(nextQuery)) return {...state, flash: {kind: 'tap', zone: 'query'}}
    return {query: nextQuery, focus: '', flash: null}
  }
  const nextFocus = entries.find(entry => entry.startsWith(nextQuery)) || ''
  return {query: nextQuery, focus: nextFocus, flash: null}
}

export function handleCommandPress(
  handler: CommandInputHandler,
  state: CommandInputState,
  char: string,
): CommandInputState {
  if (!state.query && typeof handler.onPress === 'function') {
    if (handler.onPress(char, state)) return state
  }
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

const EMPTY_HANDLER: CommandInputHandler = {
  entries: []
}

export function isStateEqual(x: CommandInputState, y: CommandInputState): boolean {
  if (x === y) return true
  if (x.focus !== y.focus || x.query !== y.query) return false
  if (x.flash === y.flash) return true
  if (!x.flash || !y.flash) return false
  return (x.flash.kind === y.flash.kind && x.flash.zone === y.flash.zone)
}

export function watchState(
  input: Observable<string>,
  handler: Observable<CommandInputHandler | null>
): Observable<CommandInputState> {
  let state: CommandInputState = {focus: '', query: '', flash: null}
  return combineLatest(
    input.pipe(map(char => ({char}))),
    handler.pipe(map(h => h || EMPTY_HANDLER))
  ).pipe(
    distinctUntilKeyChanged(0),
    mergeMap(([{char}, handler]) => {
      const next = handleCommandPress(handler, {...state}, char)
      if (next === state) return EMPTY
      const prev = {...state}
      state = next
      if (next.flash && next.flash !== prev.flash) {
        return timer(next.flash.kind === 'tap' ?  120 : 240).pipe(
          mergeMap(() => (next.flash !== prev.flash ? of({...next, flash: null}) : EMPTY)),
          startWith(next)
        )
      }
      if (isStateEqual(prev, next)) return EMPTY
      return of(next)
    }),
    startWith(state),
    share()
  )
}

export function createCommandState(
  setRawMode: NodeJS.ReadStream["setRawMode"],
  stdin: NodeJS.ReadStream
): {
  stateChange: Observable<CommandInputState>,
  handlerChange: Observable<CommandInputHandler | null>,
  nextHandler: NextCommandHandler
} {
  if (typeof setRawMode !== 'function') throw new Error('setRawMode is not a function')
  setRawMode(true)
  const inputChange = fromEvent<string>(stdin, 'data').pipe(share())
  inputChange.subscribe()// const inputSubscr =
  const handlerChange = new BehaviorSubject<CommandInputHandler | null>(null)
  const stateChange = watchState(inputChange, handlerChange)
  const nextHandler = (handler: CommandInputHandler | null): Observable<CommandInputState> => {
    handlerChange.next(handler)
    if (!handler) return EMPTY
    return stateChange.pipe(takeUntil(handlerChange.pipe(skip(1))))
  }
  return {stateChange, handlerChange: handlerChange.asObservable(), nextHandler}
}
