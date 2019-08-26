import chalk, { Chalk } from 'chalk'
import moment from 'moment'
import { safeDump } from 'js-yaml'

import { LoggerEvent, LoggerLevel, LOGGER_LEVELS, LoggerEventData } from 'nnms'

export interface LoggerFormatConfig {
  printDay?: boolean
  tags?: 'full' | 'resource'
}

export class LoggerFormat {
  private readonly _deserializeYaml: (data: {}) => string = safeDump;

  constructor (
    private readonly _cfg: LoggerFormatConfig = {}
  ) { }

  render(e: LoggerEvent): string {
    const color = chalk.keyword(LOGGER_LEVELS[e.level].color)
    const dataLines = this._getDataLines(color, e.data)
    const headerLine = [
      color(dataLines.length ? '▼': '►'),
      this._getTimePrefix(moment()),
      this._getLevelPrefix(e.level),
      this._getTagsPrefix(e.tags),
      ...(e.level === 'debug' ? [] : [this._getCode(e.code)]),
      ...(e.message === e.code ? [] : [e.message])
    ].join(' ')
    if (!e.data) return headerLine + '\n'
    return [headerLine, ...dataLines, ''].join('\n')
  }

  private _getTimePrefix(moment: moment.Moment): string {
    return chalk.grey(
      moment.utc(false).format(`${this._cfg.printDay ? 'YYYY-MM-DD ' : ''}HH:mm:ss`)
    )
  }

  private _getTagsPrefix(
    tags: { [tag: string]: string },
    format = 'resource' as  'full' | 'resource'
  ): string {
    const text = (
      format === 'resource' ?
        `${tags.resource}:${tags[tags.resource]}` :
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

  private _getDataLines(color: Chalk, eventData?: LoggerEventData): string[] {
    if (!eventData) return []
    const data = {...eventData}
    delete data.message
    if (!Object.keys(data).length) return []
    return this._deserializeYaml(data).split(/\n/g).map((line, i, lines) => (
      i === lines.length - 1 ? color('▲') : `${color('|')} ${line}`
    ))
  }
}

export default LoggerFormat
