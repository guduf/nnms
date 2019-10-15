import { Argv } from 'yargs'
import path from 'path'

import { bootstrapFile } from './bootstrap'
import Command from './command'
import LogSocket from './log_socket'
import LogFormat from './log_format'
import { loadConfig } from './shared'

export function buildConfigPath(configPath?: string): string {
  if (!configPath) return path.join(process.cwd(), './nnms.yaml')
  if (/^(?!\/)./.test(configPath)) configPath = path.join(process.cwd(), configPath)
  if (/.ya?ml$/.test(configPath)) return configPath
  if (/\/[^\.]*\/?$/.test(configPath)) return path.join(configPath, './nnms.yaml')
  throw new Error('invalid config path')
}

export const PROD_COMMAND: Command<{ config?: string }> = {
  schema: 'prod',
  descr: 'Loads N&M\'s configuration and starts application',
  argv: (
    (yargs) => (yargs as Argv<{ config?: string }>)
      .option('config', {
        type: 'string',
        alias: 'c'
      })
  ),
  cmd: async cmd => {
    const configPath = buildConfigPath(cmd.config)
    console.log(`configPath: '${configPath}'`)
    const config = await loadConfig(configPath)
    const remotePort = +(config.remotePort || 0) || 63000
    const configDir = path.dirname(configPath)
    const build = config.dist || './index.js'
    const events = bootstrapFile(path.join(configDir, build), {appName: config.app})
    const format = new LogFormat(config.logFormat || {})
    events.subscribe(e => console.log(format.render(e)))
    new LogSocket(remotePort, events)
  }
}
