import { Argv } from 'yargs'

import { Log, bootstrap, Crash } from 'nnms'

import Command from '../command'
import { LogFormat, loadConfig, runFactory } from 'nnms-process'

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
    const {modules: moduleMap} = await runFactory(cfg)
    const mods = Object.keys(moduleMap).map(key => {
      const [filepath, exportKey] = moduleMap[key].path.split('#')
      return require(filepath)[exportKey]
    })
    const {outputs} = bootstrap(...mods)
    outputs.subscribe(e => {
      if (e.type === 'LOG') console.log(format.renderLog(Log.fromEvent(e)))
      if (e.type === 'CRASH') {
        console.error(format.renderCrash(Crash.fromEvent(e)))
        process.exit(1)
      }
    })
  }
}

