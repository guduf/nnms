import chalk, { Chalk } from 'chalk'
import moment from 'moment'
import { Crash } from 'nnms'

export interface CrashFormatConfig {
  color?: string
  border?: string
  printDay?: boolean
  printStack?: boolean
}

export class CrashFormat {
  constructor (
    private readonly _cfg: CrashFormatConfig = {}
  ) { }

  render(e: Crash): string {
    if (!(e instanceof Crash)) return chalk.underline('INVALID_CRASH')
    const color = chalk.keyword(this._cfg.color || 'red')
    const [msgHeader, ...msgLines] = e.message.split('\n')
    const headerLine = [
      this._getTimePrefix(moment(e.timestamp)),
      color('CRASH'),
      ...(e.code ? [] : [color(this._getCode(e.code!))]),
      ...(e.name ? [] : [color(e.name!)]),
      ...(![e.name, e.code].includes(msgHeader)? [color(msgHeader)] : [])
    ].join(' ')
    const stack = this._cfg.printStack === false ? null : e.stack || null
    if (!msgLines.length && !stack) return `${color(this._cfg.border || '►')} ${headerLine}\n`
    const msgStack = msgLines.length ? msgLines.map(line => color(line)).join('\n') + '\n\n' : ''
    return [
      `${color('▼')} ${headerLine}`,
      ...this._getStackLines(color, msgStack + stack || ''),
      ''
    ].join('\n')
  }

  private _getTimePrefix(moment: moment.Moment): string {
    return chalk.grey(
      moment.utc(false).format(`${this._cfg.printDay ? 'YYYY-MM-DD ' : ''}HH:mm:ss`)
    )
  }

  private _getCode(code: string): string {
    return chalk.bold(code)
  }

  private _getStackLines(color: Chalk, stack: string): string[] {
    if (!stack) return []
    return stack.split(/\n/g).map((line, i, lines) => (
      i === lines.length - 1 ?
        color(this._cfg.border || '▲') :
        `${color(this._cfg.border || '|')} ${line}`
    ))
  }
}
