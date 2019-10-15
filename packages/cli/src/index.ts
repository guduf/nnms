import yargs from 'yargs'
import { COMPILE_COMMAND } from './compile'
import { REMOTE_COMMAND } from './remote'
import { PROD_COMMAND } from './prod'
import { START_COMMAND } from './start'
import Command from './command'
import { BUILD_COMMAND } from './build'

const COMMANDS: Command<any>[] = [
  BUILD_COMMAND,
  COMPILE_COMMAND,
  PROD_COMMAND,
  START_COMMAND,
  REMOTE_COMMAND
]

export default function run(): void {
  yargs.scriptName('nnms').usage('$0 <cmd> [args]')
  for (const cmd of COMMANDS) yargs.command(cmd.schema, cmd.descr, cmd.argv, cmd.cmd)
  yargs.help().demandCommand(1).argv
}

if (process.mainModule && process.mainModule.filename === __filename) run()
