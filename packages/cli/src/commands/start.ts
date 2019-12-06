import { Argv } from 'yargs'

import { Log, bootstrap, Crash } from 'nnms'

import Command from '../command'
import { LogFormat, loadConfig, runFactory } from 'nnms-process'

export const START_COMMAND: Command<{ path?: string, modules: string[] }> = {
  schema: 'start [modules..]',
  descr: 'Starts one or more N&M\'s modules',
  argv: (yargs) => (
    (yargs as Argv<{ modules: string[] }>)
      .option('path', {
        type: 'string',
        alias: 'p',
        descr: 'The filepath of N&M\'s configuration'
      })
  ),
  cmd: async (cmd) => {
    const format = new LogFormat()
    const cfg = await loadConfig(cmd.path)
    const {modules: moduleMap} = await runFactory(cfg)
    let modNames = Object.keys(moduleMap)
    if (cmd.modules.length) modNames = cmd.modules.map(name => {
      if (!modNames.includes(name)) throw new Error(
        `unknown module name '${name}'. available modules are ${modNames.map(n => `'${n}'`).join(', ')}`
      )
      return name
    })
    const mods = modNames.map(key => {
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

