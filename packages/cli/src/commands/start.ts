import { Argv } from 'yargs'

import { Log, bootstrap, Crash } from 'nnms'

import Command from '../command'
import { LogFormat, loadConfig, mapModules } from 'nnms-process'

export const START_COMMAND: Command<{ path?: string }> = {
  schema: 'start [options]',
  descr: 'Starts one or more N&M\'s modules',
  argv: (yargs) => (
    (yargs as Argv<{ path?: string }>)
      .option('path', {
        type: 'string',
        alias: 'p',
        descr: 'The filepath of N&M\'s configuration'
      })
  ),
  cmd: async cmd => {
    const format = new LogFormat()
    const cfg = await loadConfig(cmd.path)
    const moduleMap = await mapModules(cfg)
    const mods = Object.keys(moduleMap).map(key => {
      const [filepath, exportKey] = moduleMap[key].path.split('#')
      return require(filepath)[exportKey]
    })
    const events = bootstrap(...mods)
    events.subscribe(e => {
      if (e.type === 'LOG') console.log(format.render(Log.fromEvent(e)))
      if (e.type === 'CRA') console.error('CRASH:', Crash.fromEvent(e).toJson())
    })
  }
}

