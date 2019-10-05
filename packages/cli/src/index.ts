import yargs, { Argv } from 'yargs'

import { getContainerContext } from 'nnms'

import { runModules } from './runner'

import { render } from 'ink'
import NNMSUI from './ui'
import { createElement } from 'react'
import { LogStore } from './log_store'
import { createMemoryHistory } from 'history';

yargs
  .scriptName('nnms')
  .usage('$0 <cmd> [args]')
  .command(
    'start [file] [options]',
    'Starts one or more N&M\'s modules',
    (yargs) => (
      (yargs as Argv<{ file?: string }>)
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
          alias: 'p',
        })
        .option('output', {
          type: 'string',
          alias: 'o',
          choices: ['cli', 'json'],
          default: 'cli'
        })
    ),
    (cmd) => {
      if (typeof cmd.file !== 'string' || !cmd.file) {
        yargs.showHelp()
        console.error('\nMissing required argument: file\n')
        process.exit(1)
        return
      }
      const ctx = runModules(cmd.file, {appName: cmd.appName, moduleNames: cmd.moduleNames})
      if (cmd.output === 'json') renderJson()
      else {
        const logStore = new LogStore(ctx.logger)
        const history = createMemoryHistory(
          cmd.path ? {initialEntries: [cmd.path]} : {}
        )
        render(createElement(NNMSUI, {history, logStore}))
      }
    }
  )
  .help()
  .argv

export function renderJson() {
  const {logger} = getContainerContext()
  logger.events.subscribe(console.log, console.error, () => process.exit(1))
}
