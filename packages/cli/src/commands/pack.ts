import { exec } from 'child_process'
import glob from 'glob'
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

export async function buildModuleMap(bundlePath: string, cwd = process.cwd()): Promise<Record<string, JsonModuleMeta & { exportKey: string }>> {
  const script = `
    const { ModuleMeta } = require('nnms')
    try {
      source = require('${bundlePath}')
    } catch (err) {
      console.error(err)
      throw new Error('source file cannot be loaded')
    }
    const map = Object.keys(source).reduce((acc, exportKey) => {
      const modMeta = Reflect.getMetadata('nnms:module', source[exportKey])
      if (!modMeta) return acc
      if (modMeta instanceof ModuleMeta) return {...acc, [modMeta.name]: {...modMeta, exportKey}}
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
  let dist = {} as Record<string, JsonModuleMeta & { filepath: string }>
  const bundles = await p(glob)(`${config.dist}/*.js`)
  for (const filepath of bundles) {
    const moduleMap = await buildModuleMap(filepath, config.dist)
    if (!Object.keys(moduleMap).length) continue
    dist = {
      ...dist,
      ...Object.keys(moduleMap).reduce((acc, metaName) => {
        if (dist[metaName]) throw new Error('duplicate module')
        return {...acc, [metaName]: {...moduleMap[metaName], filepath}}
      }, {} as Record<string, JsonModuleMeta & { filepath: string, exportKey: string }>)
    }
  }
  console.log(`✏️  write '${config.dist}/nnms.pack.json'`)
  const packedConfig = {...config, dist}
  await p(writeFile)(`${config.dist}/nnms.pack.json`, JSON.stringify(packedConfig, null, 2))
}
