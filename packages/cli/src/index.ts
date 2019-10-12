import yargs from 'yargs'

import { START_COMMAND } from './start'

const COMMANDS = [
  START_COMMAND
]

export default function run(): void {
  yargs.scriptName('nnms').usage('$0 <cmd> [args]')
  for (const cmd of COMMANDS) yargs.command(cmd.schema, cmd.descr, cmd.argv, cmd.cmd)
  yargs.help().argv
}

if (process.mainModule && process.mainModule.filename === __filename) run()
