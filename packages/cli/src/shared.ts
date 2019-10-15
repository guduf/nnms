import { safeLoad as loadYaml } from 'js-yaml'
import { JsonObject } from 'type-fest'

import { LogFormatConfig } from './log_format'
import { join, dirname } from 'path'
import { lstat, readFile, stat } from 'fs'
import  { promisify as p } from 'util'
import Ajv from 'ajv'

export interface Config {
  app: string
  env: JsonObject
  logFormat: LogFormatConfig
  sources: string[]
  dist: string
  tsConfig: string
  remotePort: number
  root: string
}

const DEFAULT_CONFIG: Config = {
  app: '',
  env: {},
  logFormat: {},
  sources: ['./src/index.ts'],
  dist: './dist',
  tsConfig: './tsconfig.json',
  remotePort: 6390,
  root: '.'
}

export async function loadConfig(configPath = ''): Promise<Config> {
  if (!configPath.startsWith('/')) configPath = join(process.cwd(), configPath)
  const isDirectory = await p(lstat)(configPath).then(stat => stat.isDirectory()).catch(() => false)
  if (isDirectory) {
    let yamlPath = join(configPath, './nnms.yaml')
    if (await p(stat)(join(yamlPath)).then(() => true).catch(() => false)) configPath = yamlPath
    else {
      yamlPath = join(configPath, './nnms.yml')
      if (await p(stat)(join(yamlPath)).then(() => true).catch(() => false)) configPath = yamlPath
      else {
        configPath = join(configPath, './nnms.json')
        await p(stat)(configPath)
      }
    }
  }
  console.log(`load config '${configPath}'`)
  const body = await p(readFile)(configPath, 'utf8')
  if (!body) throw new Error(`failed to read config at path '${configPath}'`)
  let config = null as Partial<Config> | null
  try {
    config = /\.ya?ml/.test(configPath) ? await loadYaml(body) : JSON.parse(body)
  } catch (err) {
    console.error(err)
    throw new Error(`failed to parse config at path '${configPath}'`)
  }
  if (!config) throw new Error('invalid config')
  const root = (
    config.root && config.root.startsWith('/') ?
      config.root :
      join(dirname(configPath), config.root || DEFAULT_CONFIG.root)
  )
  const pathBuilder = (filepath: string): string => {
    return filepath.startsWith('/') ? filepath : join(root, filepath)
  }
  const npmConfig = require(join(dirname(configPath), './package.json'))
  const computed: Config = {
    root,
    app: npmConfig.name,
    env: DEFAULT_CONFIG.env,
    logFormat: DEFAULT_CONFIG.logFormat,
    sources: (
      (config.sources || DEFAULT_CONFIG.sources).map(src => pathBuilder(src))
    ),
    dist: pathBuilder(config.dist || DEFAULT_CONFIG.dist),
    tsConfig: pathBuilder(config.tsConfig || DEFAULT_CONFIG.tsConfig),
    remotePort: DEFAULT_CONFIG.remotePort
  }
  Object.freeze(computed)
  const schema = await p(readFile)(join(__dirname, '../assets/config-schema.json'))
  const ajv = new Ajv()
  let valid = await ajv.validate(schema, computed)
  if (!valid) {
    console.log(ajv.errors)
    throw new Error(`failed to validate config`)
  }
  return computed
}
