import chalk, { Chalk } from 'chalk'
import moment from 'moment'
import { safeDump } from 'js-yaml'

import { LogTags, LogLevel, LogData, LogRecord, Crash } from 'nnms'

export const LOG_LEVEL_PROPS: { [level in LogLevel]: { color: string} } = {
  DBG: {color: 'white'},
  ERR: {color: 'red'},
  INF: {color: 'green'},
  WAR: {color: 'yellow'}
}

export interface CrashFormatConfig {
  border?: string
  color?: string
  hideStack?: boolean
}

export interface LogFormatConfig {
  crash?: CrashFormatConfig
  printData?: boolean
  printDay?: boolean
  tags?: 'all' | 'src'
  width?: number
}

export class LogFormat {
  private readonly _deserializeYaml: (data: {}) => string = safeDump;

  constructor (
    private readonly _cfg: LogFormatConfig = {}
  ) { }

  renderCrash(e: Crash): string {
    const cfg = this._cfg.crash || {} as CrashFormatConfig
    if (!(e instanceof Crash)) return chalk.underline('INVALID_CRASH')
    const color = chalk.keyword(cfg.color || 'red')
    const [msgHeader, ...msgLines] = e.message.split('\n')
    const headerLine = [
      this._getTimePrefix(moment(e.timestamp)),
      color('CRASH'),
      ...(e.tags ? [this._getTagsPrefix(e.tags as LogTags)] : []),
      ...(e.code ? [color(this._getCode(e.code))] : []),
      ...(e.name ? [color(e.name)] : []),
      ...(![e.name, e.code].includes(msgHeader)? [color(msgHeader)] : [])
    ].join(' ')
    const stack = cfg.hideStack ? null : e.stack || null
    if (!msgLines.length && !stack) return `${color(cfg.border || '►')} ${headerLine}\n`
    const msgStack = msgLines.length ? msgLines.map(line => color(line)).join('\n') + '\n\n' : ''
    return [
      `${color('▼')} ${headerLine}`,
      ...this._getStackLines(color, msgStack + stack || ''),
      ''
    ].join('\n')
  }

  renderLog(e: LogRecord): string {
    if (!e) return chalk.underline('INVALID_LOG')
    const color = chalk.keyword(LOG_LEVEL_PROPS[e.level].color)
    const message = (e.data || {message: null}).message
    let data = e.data ? {...e.data} : null
    if (data) delete data.message
    if (data && !Object.keys(data).length) data = null
    const headerLine = [
      this._getTimePrefix(moment()),
      this._getLevelPrefix(e.level),
      this._getTagsPrefix(e.tags),
      ...(e.level === 'DBG' ? [] : [this._getCode(e.code)]),
      ...(message === e.code ? [] : [message])
    ].join(' ')
    if (this._cfg.printData === false || !data) return  `${color('►')} ${headerLine}\n`
    const dataSpace = (this._cfg.width || 0) - 2 - headerLine.length
    const dataLine = this._getDataLine(data, dataSpace)
    if (dataLine) return `${color('►')} ${headerLine}${dataLine}\n`
    return [`${color('▼')} ${headerLine}`, ...this._getDataLines(color, data), ''].join('\n')
  }

  private _getStackLines(color: Chalk, stack: string): string[] {
    const border = this._cfg.crash && this._cfg.crash.border || ''
    if (!stack) return []
    return stack.split(/\n/g).map((line, i, lines) => (
      i === lines.length - 1 ?
        color(border || '▲') :
        `${color(border || '|')} ${line}`
    ))
  }

  private _getTimePrefix(moment: moment.Moment): string {
    return chalk.grey(
      moment.utc(false).format(`${this._cfg.printDay ? 'YYYY-MM-DD ' : ''}HH:mm:ss`)
    )
  }

  private _getTagsPrefix(tags: LogTags, format = 'src' as  'full' | 'src'): string {
    const text = (
      format === 'src' ?
        `${tags.src}:${tags[tags.src]}` :
        Object.keys(tags).reduce((acc, tag) => (
          [...acc, `${tag}:${tags[tag]}`]
        ), [] as string[]).join(' ')
    )
    return chalk.magenta(text)
  }

  private _getCode(code: string): string {
    return chalk.bold(code)
  }

  private _getLevelPrefix(level: LogLevel): string {
    const color = chalk.bgKeyword(LOG_LEVEL_PROPS[level].color)
    return color(` ${chalk.black(level)} `)
  }

  private _getDataLine(eventData: LogData, space = 0): string {
    let line = ''
    for (const key in eventData) {
      const prefix = chalk.grey(` ▪${key}: `)
      const data = eventData[key]
      if (
        ['number', 'boolean', 'string'].includes(typeof data) ||
        data === null
      ) line += `${prefix}${String(data)}`
      else if (Array.isArray(data)) line += `${prefix}[(${data.length})]`
      else line += `${prefix}{${Object.keys(data).length ?  `…` : ''}}`
      if (space > 0 && line.length > space) return ''
    }
    return line
  }

  private _getDataLines(color: Chalk, data: LogData): string[] {
    if (!Object.keys(data).length) return []
    return this._deserializeYaml(data).split(/\n/g).map((line, i, lines) => (
      i === lines.length - 1 ? color('▲') : `${color('|')} ${line}`
    ))
  }
}


export default LogFormat
