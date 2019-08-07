import yargs, { Argv } from 'yargs'

import { runModules } from './runner'

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
      ),
      (cmd) => {
        if (typeof cmd.file !== 'string' || !cmd.file) {
          yargs.showHelp()
          console.error('\nMissing required argument: file\n')
          process.exit(1)
          return
        }
        runModules(cmd.file, {appName: cmd.appName, moduleNames: cmd.moduleNames})
      }
    )
    .help()
    .argv
}
