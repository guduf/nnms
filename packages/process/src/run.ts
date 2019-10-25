import { fork } from 'child_process'
import { join } from 'path'

import { Crash, Event, Log } from 'nnms'

import { loadConfig, Config } from './config'
import { CrashFormat } from './crash_format'
import LogFormat from './log_format'
import { mapModules, ModuleInfo } from './module_map'

export async function runProcess() {
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
  console.log(`🚀  run process with modules ${Object.keys(moduleMap).map(k => `'${k}'`).join(' ')} in dir '${cfg.root}'`)
  const runner = fork(
    join(__dirname, '../assets/runner.js'),
    Object.keys(moduleMap).map(key => moduleMap[key].path),
    {cwd: cfg.root}
  )
  const crashFormat = new CrashFormat()
  const logFormat = new LogFormat(cfg.logFormat)
  runner.on('message', msg => {
    if (msg.type === 'Buffer') {
      const e = Event.deserialize(Buffer.from(msg.data))
      if (e.type === 'LOG') console.log(logFormat.render(Log.fromEvent(e)))
      if (e.type === 'CRA') {
        console.error(crashFormat.render(Crash.fromEvent(e)))
        process.exit(1)
      }
    }
  })
}
