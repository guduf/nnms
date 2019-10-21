import { Argv, showHelp } from 'yargs'

import Command from '../command'
import LogFormat from '../log_format'
import { LogStoreRemote } from '../log_store_remote'

export const REMOTE_COMMAND: Command<{ url: string }> = {
  schema: 'remote [url]',
  descr: 'Establish a socket with a running N&M\'s application',
  argv: (yargs) => (yargs as Argv<{ url: string }>),
  cmd: async cmd => {
    if (typeof cmd.url !== 'string' || !cmd.url) {
      showHelp()
      console.error('\nMissing required argument: url\n')
      process.exit(1)
      return
    }
    const format = new LogFormat()
    const remote = await LogStoreRemote.create(cmd.url)
    // TODO - remove any assertion
    remote.getAllLogs().subscribe(e => console.log(format.render(e as any)))
  }
}
