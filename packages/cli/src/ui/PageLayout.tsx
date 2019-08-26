import * as React from 'react'
import { RouteComponentProps, Redirect } from 'react-router'
import { CommandInputState, useCommandInput, COMMAND_KEYS, parseCommandKey, ERROR_FLASH } from './command'
import { PAGE_CONFIGS, PageConfig, PageComponentProps } from './paging'

const COMMAND_MODES = {
  'text': {prefix: '', color: 'white'},
  'path': {prefix: '/', color: 'cyan'},
  'relpath': {prefix: './', color: 'cyan'},
  'search': {prefix: '?', color: 'magenta'}
} as const

export type CommandMode = keyof typeof COMMAND_MODES

export function getPageConfig(path: string[], cfgs = PAGE_CONFIGS): PageConfig | null {
  const route = cfgs.find((cfg) => {
    if (cfg.path === ':id') return /^\w+$/.test(path[0])
    return path[0] === cfg.path
  })
  if (!route) return null
  if (path.length === 1) return route
  if (!route.children) return null
  return getPageConfig(path.slice(1), route.children)
}

export function PageLayout(
  {location, match: {params}}: RouteComponentProps<{ id?: string }>
): React.ReactElement {
  const [{commandMode, redir, textCommand}, setState] = React.useState({
    commandMode: 'text' as CommandMode,
    redir: '',
    textCommand: {
      entries: [] as string[] | RegExp,
      handler: (_: string) => false as boolean
    }
  })
  const attachTextHandler: PageComponentProps['attachTextHandler'] = (handler, entries) => (
    setState({commandMode, redir, textCommand: {entries, handler}})
  )
  const detachTextHandler: PageComponentProps['detachTextHandler'] = (handler) => {
    if (handler !== textCommand.handler) return
    setState({commandMode, redir, textCommand: {entries: [], handler: () => false}})
  }
  const pageCfg = React.useMemo(() => {
    const _pageCfg = getPageConfig(location.pathname.split('/').slice(1))
    if (!_pageCfg) throw new Error(`Page config not found for path '${location.pathname}'`)
    return _pageCfg
  }, [location.pathname])
  const commandState = useCommandInput(() => {
    const absEntries = PAGE_CONFIGS.reduce((acc, absCfg) => (
      [...acc, ...(absCfg === pageCfg ? [] : [absCfg.path])]
      ), [] as string[])
    const relEntries = (pageCfg.children || []).reduce((acc, child) => (
      [...acc, ...(child.path[0] === ':' ? [] : [child.path])]
    ), [] as string[])
    const searchEntries = Object.keys(pageCfg.search || {})
    const onPress = (char: string, {query}: CommandInputState): boolean => {
      if (parseCommandKey(char) === COMMAND_KEYS.BACK && !query && commandMode !== 'text') {
        setState({commandMode: 'text', redir: '', textCommand})
        return true
      }
      if (query.length || !['.', '/', '?'].includes(char)) return false
      if (
        (char === '.' && !relEntries.length) || (char === '?' && !searchEntries.length)
      ) throw ERROR_FLASH
      const mode: CommandMode = char === '.' ? 'relpath' : char === '/' ? 'path' : 'search'
      setState({commandMode: mode, redir: '', textCommand})
      return true
    }
    const {color, prefix} = COMMAND_MODES[commandMode]
    const onSubmit = (focus: string): boolean => {
      if (commandMode === 'path') {
        setState({commandMode, redir: `/${focus}`, textCommand})
        return true
      }
      if (commandMode === 'text') textCommand.handler(focus)
      return false
    }
    const entries = (
      commandMode === 'text' ? textCommand.entries :
        commandMode === 'relpath' ? relEntries :
          commandMode === 'search' ? searchEntries :
            absEntries
    )
    return {entries, onPress, color, prefix, onSubmit}
  }, {}, [commandMode, textCommand])
  if (redir) return <Redirect to={redir} />
  const pageComponentProps = {
    location,
    commandState,
    attachTextHandler,
    detachTextHandler,
    id: params.id
  }
  return (
    <pageCfg.component {...pageComponentProps}/>
  )
}

export default PageLayout
