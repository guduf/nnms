import { render } from 'ink'
import { createMemoryHistory } from 'history'
import { createElement } from 'react'
import { Argv, showHelp } from 'yargs'

import { getContainerContext } from 'nnms'

import { bootstrapFile } from '../bootstrap'
import Command from '../command'
import { LogStore } from '../log_store'
import NNMSUI from '../ui'

export const START_COMMAND: Command<{ file: string, appName?: string, moduleNames?: string[], path?: string }> = {
  schema: 'start [file] [options]',
  descr: 'Starts one or more N&M\'s modules',
  argv: (yargs) => (
    (yargs as Argv<{ file: string }>)
      .option('appName', {
        type: 'string',
        alias: 'n'
      })
      .option('moduleNames', {
        type: 'array',
        string: true,
        alias: 'm'
      })
      .option('path', {
        type: 'string',
        alias: 'p'
      })
      .option('output', {
        type: 'string',
        alias: 'o',
        choices: ['cli', 'json'],
        default: 'cli'
      })
  ),
  cmd: cmd => {
    if (typeof cmd.file !== 'string' || !cmd.file) {
      showHelp()
      console.error('\nMissing required argument: file\n')
      process.exit(1)
      return
    }
    const events = bootstrapFile(cmd.file, {appName: cmd.appName, moduleNames: cmd.moduleNames})
    if (cmd.output === 'json') renderJson()
    else {
      const logStore = new LogStore(events)
      const history = createMemoryHistory(
        cmd.path ? {initialEntries: [cmd.path]} : {}
      )
      render(createElement(NNMSUI, {history, logStore}))
    }
  }
}

export function renderJson() {
  const {logger} = getContainerContext()
  logger.events.subscribe(console.log, console.error, () => process.exit(1))
}

