import { Argv, showHelp } from 'yargs'

import { getContainerContext } from 'nnms'

import Command from './command'
import LogFormat from './log_format'
import LogStoreRemote from './log_store_remote'

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
    remote.getAllLogs().subscribe(e => console.log(format.render(e)))
  }
}

export function renderJson() {
  const {logger} = getContainerContext()
  logger.events.subscribe(console.log, console.error, () => process.exit(1))
}

