import yargs, { showHelp } from 'yargs'

import { REMOTE_COMMAND } from './remote'
import { PROD_COMMAND } from './prod'
import { START_COMMAND } from './start'
import Command from './command'

const COMMANDS: Command<any>[] = [
  PROD_COMMAND,
  START_COMMAND,
  REMOTE_COMMAND
]

export default function run(): void {
  yargs.scriptName('nnms').usage('$0 <cmd> [args]')
  for (const cmd of COMMANDS) yargs.command(cmd.schema, cmd.descr, cmd.argv, cmd.cmd)
  yargs.command({command: '*', handler: () => showHelp()})
  yargs.help().argv
}

if (process.mainModule && process.mainModule.filename === __filename) run()
