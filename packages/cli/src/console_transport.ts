import chalk, { Chalk } from 'chalk'
import moment from 'moment'
import { safeDump } from 'js-yaml'
import Transport from 'winston-transport'

import { LoggerEvent, LoggerLevel, LOGGER_LEVELS } from 'nnms'

export interface ConsoleTransportConfig  {
  printDay?: boolean
}

export class ConsoleTransport extends Transport {
  private readonly _deserializeYaml: (data: {}) => string = safeDump;

  constructor (
    private readonly _console: { log: (msg: string) => void },
    private readonly _cfg: ConsoleTransportConfig = {},
    transportOpts: Transport.TransportStreamOptions = {}
  ) {
    super(transportOpts)
  }

  log(e: LoggerEvent, callback: () => void): void {
    setImmediate(() => {
      try {
        if (!typeof e.level || !e.level.length) throw new TypeError('Invalid message format')
        this._console.log(this._render(e as LoggerEvent))
      } catch (err) {
        let msg = 'UNKNOWN'
        try { msg = e.message } catch (_) { }
        this._console.log(
          chalk.underline(`LOGGER_ERROR error='${err.message}' e='${msg}'`)
        )
      }
    })
    callback()
  }

  private _render(e: LoggerEvent): string {
    const color = chalk.keyword(LOGGER_LEVELS[e.level].color)
    const dataLines = this._getDataLines(color, e.data)
    const headerLine = [
      color(dataLines.length ? '▼': '▶'),
      this._getTimePrefix(moment()),
      this._getLevelPrefix(e.level),
      this._getUriPrefix(e.uri),
      e.message || chalk.underline('MISSING_MESSAGE')
    ].join(' ')
    if (!e.data) return headerLine + '\n'
    return [headerLine, ...dataLines, ''].join('\n')
  }

  private _getTimePrefix(moment: moment.Moment): string {
    return chalk.grey(
      moment.utc(false).format(`${this._cfg.printDay ? 'YYYY-MM-DD ' : ''}HH:mm:ss`)
    )
  }

  private _getUriPrefix(uri: string[]): string {
    return chalk.magenta(uri.join('/'))
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

  private _getDataLines(color: Chalk, data?: {}): string[] {
    if (!data || !Object.keys(data).length) return []
    return this._deserializeYaml(data).split(/\n/g).map((line, i, lines) => (
      i === lines.length - 1 ? color('▲') : `${color('|')} ${line}`
    ))
  }
}

export default ConsoleTransport
