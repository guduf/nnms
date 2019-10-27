import yargs from 'yargs'
import { BUILD_COMMAND } from './commands/build'
import Command from './command'
import { COMPILE_COMMAND } from './commands/compile'
import { LINK_COMMAND } from './commands/link'
import { PACK_COMMAND } from './commands/pack'
import { START_COMMAND } from './commands/start'

const COMMANDS: Command<any>[] = [
  BUILD_COMMAND,
  COMPILE_COMMAND,
  LINK_COMMAND,
  PACK_COMMAND,
  START_COMMAND
]

export default function run(): void {
  yargs.scriptName('nnms').usage('$0 <cmd> [args]')
  for (const cmd of COMMANDS) yargs.command(cmd.schema, cmd.descr, cmd.argv, cmd.cmd)
  yargs.help().demandCommand(1).argv
}

if (process.mainModule && process.mainModule.filename === __filename) run()
