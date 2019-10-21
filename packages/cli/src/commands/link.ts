import { exec } from 'child_process'
import glob from 'glob'
import { join } from 'path'
import { promisify as p } from 'util'

import Command from '../command'
import { getNNMSVersion } from '../shared'

export const LINK_COMMAND: Command<{ dist?: string, install?: string }> = {
  schema: 'link [dist]',
  descr: 'Install N&M\'s built tarballs on current directory',
  argv: yargs => (
    yargs
      .option('install', {
        type: 'string',
        alias: 'i',
        descr: 'installation mode'
      })
  ),
  cmd: async cmd => {
    const distPath = (
      !cmd.dist ?
        '/opt/nnms/dist' :
        cmd.dist.startsWith('/') ? cmd.dist : join(process.cwd(), cmd.dist)
    ).replace(/(\/|\\)$/, '')
    await link(distPath, cmd.install)
  }
}

export async function link(distPath: string, install = 'no-save'): Promise<void> {
  const tarballs = await p(glob)(`${distPath}/nnms*-${getNNMSVersion()}.tgz`)
  if (!tarballs.length) throw new Error(
    `none file match '${distPath}/nnms*-${getNNMSVersion()}.tgz'`
  )
  console.log(`🔌  link ${tarballs.map(t => `'${t.match(/\/(nnms(?:[\w-]*))-\d[^\/]*$/)![1]}'`).join(' ')}`)
  await p(exec)(`npm install --${install} ${tarballs.join(' ')}`)
}
