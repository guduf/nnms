import yargs, { Argv } from 'yargs'

import { getContainerContext } from 'nnms'

import { runModules } from './runner'

import { render } from 'ink'
import NNMSUI from './ui'
import { createElement } from 'react'

if (process.mainModule && process.mainModule.filename === __filename) {
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
          .option('output', {
            string: true,
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
        runModules(cmd.file, {appName: cmd.appName, moduleNames: cmd.moduleNames})
        if (cmd.output === 'json') renderJson()
        else render(createElement(NNMSUI))
      }
    )
    .help()
    .argv
}

export function renderJson() {
  const {logger: {events}} = getContainerContext()
  events.subscribe(console.log, console.error, () => process.exit(1))
}
