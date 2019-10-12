import { Argv } from 'yargs'
import { safeLoad as loadYaml } from 'js-yaml'
import { promisify as p } from 'util'
import { JsonObject } from 'type-fest'
import { readFile } from 'fs'
import path from 'path'

import { bootstrapFile } from './bootstrap'
import Command from './command'
import LogSocket from './log_socket'
import LogFormat, { LogFormatConfig } from './log_format'

export interface ProdConfig {
  app: string
  env?: JsonObject
  console?: LogFormatConfig
  build?: string
  remotePort?: number
}

export function buildConfigPath(configPath?: string): string {
  if (!configPath) return path.join(process.cwd(), './nnms.yaml')
  if (/^(?!\/)./.test(configPath)) configPath = path.join(process.cwd(), configPath)
  if (/.ya?ml$/.test(configPath)) return configPath
  if (/\/[^\.]*\/?$/.test(configPath)) return path.join(configPath, './nnms.yaml')
  throw new Error('invalid config path')
}

export async function loadConfig(filepath: string): Promise<ProdConfig> {
  const body = await p(readFile)(filepath, 'utf8')
  return loadYaml(body)
}

export const PROD_COMMAND: Command<{ configPath: string }> = {
  schema: 'prod [configPath]',
  descr: 'Starts one or more N&M\'s modules in a docker container',
  argv: (yargs) => (yargs as Argv<{ configPath: string }>),
  cmd: async cmd => {
    const configPath = buildConfigPath(cmd.configPath)
    let config: ProdConfig
    try {
      config = await loadConfig(configPath)
    } catch (e) {
      console.error('LOAD_CONFIG', e)
      process.exit(1)
      return
    }
    const remotePort = +(config.remotePort || 0) || 63000
    const configDir = path.dirname(configPath)
    const build = config.build || './index.js'
    const events = bootstrapFile(path.join(configDir, build), {appName: config.app})
    const format = new LogFormat(config.console || {})
    events.subscribe(e => console.log(format.render(e)))
    new LogSocket(remotePort, events)
  }
}
