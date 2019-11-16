import { Config, loadConfig } from './config'
import { runFactory, FactoryConfig } from './run_factory'
import { ForkedProcess } from './run_process'
import { LogFormat } from './log_format'
import { LogServer } from './log_server'
import { Crash, Log, LogTags } from 'nnms'
import { mergeMap } from 'rxjs/operators'
import { merge, Subscription, OperatorFunction, EMPTY } from 'rxjs'
import { Server as WsServer } from 'ws'

export class Container {
  private static _instance: Container
  private static _format = new LogFormat()

  private static _exit(catched?: Error | Crash | null, tags?: LogTags): void {
    const crash = catched ? catched instanceof Crash ? catched : Crash.create(catched, tags || {src: 'unknown'}) : null
    if (crash) {
      console.error(Container._format.renderCrash(crash))
    }
    if (this._instance) try {
      if (this._instance._logServer) this._instance._logServer.close()
      this._instance._subscr.unsubscribe()
      this._instance._fork.interrupt()
    } catch (err) { }
    process.exit(crash ? 1 : 0)
  }

  static async run(): Promise<void> {
    process.on('SIGINT', () => Container._exit())
    if (this._instance) throw new Error('instance already running')
    let cfg: Config
    try {
      cfg = await loadConfig(process.env['NNMS_CONFIG_PATH'])
    } catch (err) {
      console.error(`❗️ ${err.message}`)
      return this._exit(err)
    }
    if (cfg.container.logFormat) Container._format = new LogFormat(cfg.container.logFormat)
    let factory = (cfg as Config & { $aot?: FactoryConfig }).$aot
    if (!factory) try { factory = await runFactory(cfg) } catch (err) {
      console.error(`❗️ ${err.message}`)
      return this._exit(err)
    }
    const moduleMap  = factory.modules
    let fork: ForkedProcess
    const modulePaths = Object.keys(moduleMap).map(key => moduleMap[key].path)
    try {
      console.log(`🚀  fork ${Object.keys(moduleMap).map(k => `'${k}'`).join(' ')} in dir '${cfg.root}'`)
      fork = new ForkedProcess(cfg, modulePaths)
    } catch (err) {
      console.error(`❗️ ${err.message}`)
      return this._exit(err)
    }
    this._instance = new Container(cfg, fork)
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

  private _handleCrash(): OperatorFunction<Crash, never> {
    return crashObs => crashObs.pipe(mergeMap(crash => {
      console.error(Container._format.renderCrash(crash))
      Container._exit(crash)
      return EMPTY
    }))
  }

  private _handleLog(): OperatorFunction<Log, never> {
    if (this._cfg.container.logFormat === null) return () => EMPTY
    return logObs => logObs.pipe(mergeMap(log => {
      console.log(Container._format.renderLog(log))
      return EMPTY
    }))
  }
}
