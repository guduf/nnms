import { Argv, showHelp } from 'yargs'
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
}

export async function loadConfig(filepath: string): Promise<ProdConfig> {
  const body = await p(readFile)(path.join(process.cwd(), filepath), 'utf8')
  return loadYaml(body)
}

export const PROD_COMMAND: Command<{ configPath: string }> = {
  schema: 'prod [configPath]',
  descr: 'Starts one or more N&M\'s modules in a docker container',
  argv: (yargs) => (yargs as Argv<{ configPath: string }>),
  cmd: async cmd => {
    if (typeof cmd.configPath !== 'string' || !cmd.configPath) {
      showHelp()
      console.error('\nMissing required argument: config\n')
      process.exit(1)
      return
    }
    let config: ProdConfig
    try {
      config = await loadConfig(cmd.configPath)
    } catch (e) {
      console.error('LOAD_CONFIG', e)
      process.exit(1)
      return
    }
    const configDir = path.join(process.cwd(), path.dirname(cmd.configPath))
    const filePath = path.join(configDir, './index.js')
    const events = bootstrapFile(filePath, {appName: config.app})
    const format = new LogFormat(config.console || {})
    events.subscribe(e => console.log(format.render(e)))
    new LogSocket(6300, events)
  }
}
