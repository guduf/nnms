import { writeFile } from 'fs'
import { promisify as p } from 'util'

import Command from '../command'
import { loadConfig, Config, runFactory } from 'nnms-process'
import { compile } from './compile'
import { link } from './link'

export const PACK_COMMAND: Command<{ path?: string, skipLink?: boolean }> = {
  schema: 'pack',
  descr: 'Pack a N&M\'s application',
  argv: yargs => (
    yargs
      .option('skipLink', {
        type: 'boolean',
        descr: 'skip the link task'
      })
      .option('path', {
        type: 'string',
        alias: 'p',
        descr: 'filepath of N&M\'s configuration'
      })
  ),
  cmd: async cmd => {
    const config = await loadConfig(cmd.path)
    await pack(config, cmd.skipLink)
  }
}

export async function pack(config: Config, skipLink?: boolean): Promise<void> {
  if (!skipLink) await link(`${process.env['NNMS_PATH'] || '/opt/nnms'}/dist`, 'save')
  await compile(config, true)
  console.log(`✏️  write 'nnms.aot.json'`)
  const packedConfig = {...config, $aot: await runFactory(config)}
  await p(writeFile)(`nnms.aot.json`, JSON.stringify(packedConfig, null, 2))
}
