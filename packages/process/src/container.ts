import { Config, loadConfig } from './config'
import { mapModules, ModuleInfo } from './map_modules'
import { ForkedProcess } from './forked_process'
import LogFormat from './log_format'
import { CrashFormat } from './crash_format'
import { Log, Crash } from 'nnms'
import { tap,  } from 'rxjs/operators'
import { merge, Subscription } from 'rxjs'

export class Container {
  static async run(): Promise<void> {
    const cfg = (
      await loadConfig(process.env['NNMS_CONFIG_PATH'])
    ) as Config & { moduleMap: Record<string, string> }
    let moduleMap = {} as Record<string, ModuleInfo>
    try {
      moduleMap = await mapModules(cfg)
    } catch (err) {
      console.error(`❗️ ${err.message}`)
      process.exit(1)
    }
    let fork: ForkedProcess
    const modulePaths = Object.keys(moduleMap).map(key => moduleMap[key].path)
    try {
      console.log(`🚀  fork ${Object.keys(moduleMap).map(k => `'${k}'`).join(' ')} in dir '${cfg.root}'`)
      fork = new ForkedProcess(cfg, modulePaths)
    } catch (err) {
      console.error(`❗️ ${err.message}`)
      return process.exit(1)
    }
    new Container(cfg, fork)
  }

  private constructor(
    private readonly _cfg: Config,
    private readonly _fork: ForkedProcess
  ) {
    const crashHandler = this._fork.crash.pipe(tap(e => this._handleCrash(e)))
    const logHandler = this._fork.logs.pipe(tap(e => this._handleLog(e)))
    this._subscr = merge(crashHandler, logHandler).subscribe()
  }

  private readonly _crashFormat = new CrashFormat()
  private readonly _logFormat = new LogFormat(this._cfg.logFormat)
  private readonly _subscr: Subscription

  kill(code = 1) {
    this._fork.interrupt()
    this._subscr.unsubscribe()
    process.exit(code)
  }

  private _handleCrash(crash: Crash): void {
    console.log(this._crashFormat.render(crash))
    this.kill(1)
  }

  private _handleLog(log: Log): void {
    console.log(this._logFormat.render(log))
  }
}
