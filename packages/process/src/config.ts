import { safeLoad as loadYaml } from 'js-yaml'

import { LogFormatConfig } from './log_format'
import { join, dirname } from 'path'
import { lstat, readFile, stat } from 'fs'
import  { promisify as p } from 'util'
import Ajv from 'ajv'

export interface Config {
  app: string
  dist: string
  root: string
  container: {
    logFormat: LogFormatConfig | null
    logServer: { host?: string, port?: number } | null
  }
  sources: string[]
  tsConfig: string
  externals: string[]
}
const DEFAULT_CONFIG: Config = {
  app: '',
  container: {
    logFormat: {},
    logServer: {}
  },
  sources: ['./src/index.ts'],
  dist: './dist',
  tsConfig: './tsconfig.json',
  root: '.',
  externals: []
}

export async function loadConfig(configPath = ''): Promise<Config> {
  if (!configPath.startsWith('/')) configPath = join(process.cwd(), configPath)
  const isDirectory = await p(lstat)(configPath).then(stat => stat.isDirectory()).catch(() => false)
  if (isDirectory) for (const suffix of ['aot.json', 'json', 'yaml', 'yml', null]) {
    if (!suffix) throw new Error('cannot find any suffix in config directory')
    if (await p(stat)(join(configPath, `./nnms.${suffix}`)).then(() => true).catch(() => false)) {
      configPath = join(configPath, `./nnms.${suffix}`)
      break
    }
  }
  console.log(`⚙️  load config '${configPath}'`)
  let body = ''
  try {
    body = await p(readFile)(configPath, 'utf8')
  } catch (err) {
    throw new Error(`cannot read config: ${err.message}`)
  }
  if (!body) throw new Error(`failed to read config at path '${configPath}'`)
  let cfg = null as Partial<Config> | null
  try {
    cfg = /\.ya?ml/.test(configPath) ? await loadYaml(body) : JSON.parse(body)
  } catch (err) {
    console.error(err)
    throw new Error(`failed to parse config at path '${configPath}'`)
  }
  if (!cfg) throw new Error('invalid config')
  if (/\.aot\.json/.test(configPath)) return cfg as Config
  const root = (
    cfg.root && cfg.root.startsWith('/') ?
      cfg.root :
      join(dirname(configPath), cfg.root || DEFAULT_CONFIG.root)
  )
  const pathBuilder = (filepath: string): string => {
    filepath = filepath.startsWith('/') ? filepath : join(root, filepath)
    return filepath.replace(/(\/|\\)$/, '')
  }
  const npmConfig = require(join(dirname(configPath), './package.json'))
  const computed: Config = {
    app: npmConfig.name,
    dist: pathBuilder(cfg.dist || DEFAULT_CONFIG.dist),
    root,
    container: {
      ...DEFAULT_CONFIG.container,
      ...(cfg.container || {})
    },
    sources: (
      (cfg.sources || DEFAULT_CONFIG.sources).map(src => pathBuilder(src))
    ),
    tsConfig: pathBuilder(cfg.tsConfig || DEFAULT_CONFIG.tsConfig),
    externals: cfg.externals || DEFAULT_CONFIG.externals
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
