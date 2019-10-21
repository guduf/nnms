import { Observable } from 'rxjs'
import { Argv } from 'yargs'

import { Event, Log, bootstrap } from 'nnms'

import Command from '../command'
import LogFormat from '../log_format'
import { loadConfig, buildModulesMap } from '../shared'

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
    const config = await loadConfig(cmd.path)
    const moduleMap = await buildModulesMap(config.dist)
    const mods = Object.keys(moduleMap).map(key => (
      require(moduleMap[key].filepath)[moduleMap[key].exportKey]
    ))
    const events = bootstrap(...mods)
    events.subscribe(e => console.log(format.render(Log.fromEvent(e))))
  }
}

export function renderJson(events: Observable<Event>) {
  events.subscribe(console.log, console.error, () => process.exit(1))
}

