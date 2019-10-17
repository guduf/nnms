import { exec } from 'child_process'
import { writeFile } from 'fs'
import { promisify as p } from 'util'

import Command from '../command'
import { loadConfig, Config } from '../shared'
import { compile } from './compile'
import { link } from './link'
import { JsonObject } from 'type-fest'

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

export interface JsonResourceMeta {
  name: string
  vars: JsonObject
  providers: JsonResourceMeta[]
}

export interface JsonModuleMeta extends JsonResourceMeta {
  plugins: JsonResourceMeta[]
}

export async function buildModuleMap(sourcePath: string, cwd = process.cwd()): Promise<Record<string, JsonModuleMeta>> {
  const script = `
    const { ModuleMeta } = require('nnms')
    try {
      source = require('${sourcePath}')
    } catch (err) {
      console.error(err)
      throw new Error('source file cannot be loaded')
    }
    const map = Object.keys(source).reduce((acc, key) => {
      const modMeta = Reflect.getMetadata('nnms:module', source[key])
      if (!modMeta) return acc
      if (modMeta instanceof ModuleMeta) return {...acc, [modMeta.name]: modMeta}
      return acc
    }, {})
    console.log(JSON.stringify(map))
`
  const {stdout} = await p(exec)(`node -e "${script}"`, {cwd})
  return JSON.parse(stdout)
}

export async function pack(config: Config, skipLink?: boolean): Promise<void> {
  if (!skipLink) await link(`${process.env['NNMS_PATH'] || '/opt/nnms'}/dist`, 'save')
  await compile(config, true)
  console.log(`✏️  write '${config.dist}/nnms.pack.json'`)
  await p(writeFile)(`${config.dist}/nnms.pack.json`, JSON.stringify(config, null, 2))
  const moduleMap = await buildModuleMap(`${config.dist}/bundle.js`, config.dist)
  console.log(moduleMap)
}
