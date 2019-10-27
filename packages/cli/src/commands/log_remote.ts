import { logSocket, LogFormat } from 'nnms-process'

import Command from '../command'

export const LOG_REMOTE_COMMAND: Command<{ url?: string }> = {
  schema: 'log-remote [url]',
  descr: 'Install N&M\'s built tarballs on current directory',
  argv: yargs => (
    yargs
  ),
  cmd: cmd => {
    const format = new LogFormat()
    logSocket(cmd.url || '').subscribe(e => console.log(format.render(e)))
  }
}
