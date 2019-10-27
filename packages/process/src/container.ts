import { Config, loadConfig } from './config'
import { runFactory, FactoryConfig } from './run_factory'
import { ForkedProcess } from './run_process'
import { LogFormat } from './log_format'
import { LogServer } from './log_server'
import { CrashFormat } from './crash_format'
import { Crash, Log } from 'nnms'
import { mergeMap } from 'rxjs/operators'
import { merge, Subscription, OperatorFunction, EMPTY } from 'rxjs'
import { Server as WsServer } from 'ws'

export class Container {
  static async run(): Promise<void> {
    let cfg: Config
    try {
      cfg = await loadConfig(process.env['NNMS_CONFIG_PATH'])
    } catch (err) {
      console.error(`❗️ ${err.message}`)
      return process.exit(1)
    }
    let factory = (cfg as Config & { $aot?: FactoryConfig }).$aot
    if (!factory) try { factory = await runFactory(cfg) } catch (err) {
      console.error(`❗️ ${err.message}`)
      return process.exit(1)
    }
    const moduleMap  = factory.modules
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
    private readonly _fork: ForkedProcess,
  ) {
    if (this._cfg.container.logServer) {
      this._logServer = new LogServer(this._fork.logs,this._cfg.container.logServer)
    }
    const crashHandler = this._fork.crash.pipe(this._handleCrash())
    const logHandler = this._fork.logs.pipe(this._handleLog())
    this._subscr = merge(crashHandler, logHandler).subscribe()
  }

  private readonly _logServer?: WsServer
  private readonly _subscr: Subscription

  kill(code = 1): void {
    if (this._logServer) this._logServer.close()
    this._fork.interrupt()
    this._subscr.unsubscribe()
    process.exit(code)
  }

  private _handleCrash(): OperatorFunction<Crash, never> {
    const crashFormat = new CrashFormat()
    return crashObs => crashObs.pipe(mergeMap(crash => {
      console.error(crashFormat.render(crash))
      this.kill(1)
      return EMPTY
    }))
  }

  private _handleLog(): OperatorFunction<Log, never> {
    if (this._cfg.container.logFormat === null) return () => EMPTY
    const logFormat = new LogFormat(this._cfg.container.logFormat)
    return logObs => logObs.pipe(mergeMap(log => {
      console.log(logFormat.render(log))
      return EMPTY
    }))
  }
}
