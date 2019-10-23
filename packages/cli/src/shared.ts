import { exec } from 'child_process'
import glob from 'glob'
import { safeLoad as loadYaml } from 'js-yaml'
import { JsonObject } from 'type-fest'

import { LogFormatConfig } from './log_format'
import { join, dirname } from 'path'
import { lstat, readFile, stat } from 'fs'
import  { promisify as p } from 'util'
import Ajv from 'ajv'
import semverRegex from 'semver-regex'

export interface Config {
  app: string
  env: JsonObject
  logFormat: LogFormatConfig
  sources: string[]
  dist: string
  tsConfig: string
  remotePort: number
  root: string
  externals: string[]
}

const DEFAULT_CONFIG: Config = {
  app: '',
  env: {},
  logFormat: {},
  sources: ['./src/index.ts'],
  dist: './dist',
  tsConfig: './tsconfig.json',
  remotePort: 6390,
  root: '.',
  externals: []
}

export interface JsonResourceMeta {
  name: string
  vars: JsonObject
  providers: JsonResourceMeta[]
}

export interface JsonModuleMeta extends JsonResourceMeta {
  plugins: JsonResourceMeta[]
}

export async function buildModuleMap(
  bundlePath: string,
  cwd = process.cwd()
): Promise<Record<string, JsonModuleMeta & { exportKey: string }>> {
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

export type ModuleMap = Record<string, JsonModuleMeta & { filepath: string, exportKey: string }>

export async function buildModulesMap(distPath: string): Promise<ModuleMap> {
  let dist = {} as ModuleMap
  const bundles = await p(glob)(`${distPath}/*.js`)
  for (const filepath of bundles) {
    const moduleMap = await buildModuleMap(filepath, distPath)
    if (!Object.keys(moduleMap).length) continue
    dist = {
      ...dist,
      ...Object.keys(moduleMap).reduce((acc, metaName) => {
        if (dist[metaName]) throw new Error(
          `duplicate module '${metaName}' between '${dist[metaName].filepath}' and '${filepath}'`
        )
        return {...acc, [metaName]: {...moduleMap[metaName], filepath}}
      }, {} as Record<string, JsonModuleMeta & { filepath: string, exportKey: string }>)
    }
  }
  return dist
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
  console.log(`⚙️  load config '${configPath}'`)
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
    filepath = filepath.startsWith('/') ? filepath : join(root, filepath)
    return filepath.replace(/(\/|\\)$/, '')
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
    remotePort: DEFAULT_CONFIG.remotePort,
    externals: config.externals || []
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

export function getNNMSVersion(): string {
  const npmConfig = require(join(__dirname, '../package.json')) as { version: string }
  const version = (npmConfig.version || '').replace(/^v/, '')
  if (!semverRegex().test(version)) throw new Error('invalid version')
  return version
}
