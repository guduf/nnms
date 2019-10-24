import { fork } from 'child_process'
import { join } from 'path'

import { Crash, Event, Log } from 'nnms'

import { mapModules } from './module_map'
import { loadConfig, Config } from './config'

export async function runModules() {
  const cfg = await loadConfig(process.env['NNMS_CONFIG_PATH']) as Config & { moduleMap: Record<string, string> }
  const moduleMap = await mapModules(cfg)
  console.log('fork runner ', cfg.root)
  const runner = fork(
    join(__dirname, '../assets/runner.js'),
    Object.keys(moduleMap).map(key => moduleMap[key].path),
    {cwd: cfg.root}
  )
  runner.on('message', msg => {
    if (msg.type === 'Buffer') {
      const e = Event.deserialize(Buffer.from(msg.data))
      if (e.type === 'LOG') console.log('LOG:', Log.fromEvent(e).toJson())
      if (e.type === 'CRA') console.error('CRASH:', Crash.fromEvent(e).toJson())
    }
  })
}
