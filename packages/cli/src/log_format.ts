import chalk, { Chalk } from 'chalk'
import moment from 'moment'
import { safeDump } from 'js-yaml'

import { LoggerEvent, LoggerTags, LoggerLevel, LOGGER_LEVELS, LoggerEventData } from 'nnms'

export interface LoggerFormatConfig {
  printData?: boolean
  printDay?: boolean
  tags?: 'full' | 'src'
  width?: number
}

export class LogFormat {
  private readonly _deserializeYaml: (data: {}) => string = safeDump;

  constructor (
    private readonly _cfg: LoggerFormatConfig = {}
  ) { }

  render(e: LoggerEvent): string {
    if (!e) return chalk.underline('INVALID_LOG')
    const color = chalk.keyword(LOGGER_LEVELS[e.level].color)
    const message = e.message || (e.data || {message: null}).message
    let data = e.data ? {...e.data} : null
    if (data) delete data.message
    if (data && !Object.keys(data).length) data = null
    const headerLine = [
      this._getTimePrefix(moment()),
      this._getLevelPrefix(e.level),
      this._getTagsPrefix(e.tags),
      ...(e.level === 'debug' ? [] : [this._getCode(e.code)]),
      ...(message === e.code ? [] : [message])
    ].join(' ')
    if (this._cfg.printData === false || !data) return  `${color('►')} ${headerLine}\n`
    const dataSpace = (this._cfg.width || 0) - 2 - headerLine.length
    const dataLine = this._getDataLine(data, dataSpace)
    if (dataLine) return `${color('►')} ${headerLine}${dataLine}\n`
    return [`${color('▼')} ${headerLine}`, ...this._getDataLines(color, data), ''].join('\n')
  }

  private _getTimePrefix(moment: moment.Moment): string {
    return chalk.grey(
      moment.utc(false).format(`${this._cfg.printDay ? 'YYYY-MM-DD ' : ''}HH:mm:ss`)
    )
  }

  private _getTagsPrefix(
    tags: LoggerTags,
    format = 'src' as  'full' | 'src'
  ): string {
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

  private _getLevelPrefix(level: LoggerLevel): string {
    const prefix = (
      level === 'debug' ? 'DBG' :
        level === 'error' ? 'ERR' :
          level === 'info' ? 'INF' :
            level === 'warn' ? 'WRN' :
              'UKN'
    )
    const color = chalk.bgKeyword(LOGGER_LEVELS[level].color)
    return color(` ${chalk.black(prefix)} `)
  }

  private _getDataLine(eventData: LoggerEventData, space = 0): string {
    let line = ''
    for (const key in eventData) {
      const prefix = chalk.grey(` ▪${key}: `)
      if (
        ['number', 'boolean', 'string'].includes(typeof eventData[key]) ||
        eventData[key] === null
      ) line += `${prefix}${String(eventData[key])}`
      else if (Array.isArray(eventData[key])) line += `${prefix}[(${eventData[key].length})]`
      else line += `${prefix}{${Object.keys(eventData[key]).length ?  `…` : ''}}`
      if (space > 0 && line.length > space) return ''
    }
    return line
  }

  _getDataLines(color: Chalk, data: LoggerEventData): string[] {
    if (!Object.keys(data).length) return []
    return this._deserializeYaml(data).split(/\n/g).map((line, i, lines) => (
      i === lines.length - 1 ? color('▲') : `${color('|')} ${line}`
    ))
  }
}


export default LogFormat
