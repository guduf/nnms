import mkdirp from 'mkdirp'
import { Plugin, InputOptions, rollup } from 'rollup'
import commonjs from 'rollup-plugin-commonjs'
import json from 'rollup-plugin-json'
import resolve from 'rollup-plugin-node-resolve'
import rollupTypescript from 'rollup-plugin-typescript2'
import typescript from 'typescript'
import { promisify as p } from 'util'
import { Argv } from 'yargs'

import Command from '../command'
import { loadConfig, Config } from 'nnms-process'

export const COMPILE_COMMAND: Command<{ path?: string }> = {
  schema: 'compile',
  descr: 'Compile a N&M\'s application',
  argv: (yargs) => (
    (yargs as Argv<{ path?: string, resolveModule?: boolean }>)
      .option('path', {
        type: 'string',
        alias: 'p',
        descr: 'The filepath of N&M\'s configuration'
      })
      .option('resolveModule', {
        type: 'boolean',
        alias: 'r',
        descr: 'Whether the node modules should be bundled'
      })
  ),
  cmd: async cmd => {
    const config = await loadConfig(cmd.path)
    await compile(config, Boolean(cmd.resolveModule))
  }
}

const NODE_BUILTIN = ['buffer', 'cluster', 'crypto', 'dns', 'events', 'fs', 'http', 'https', 'module', 'net', 'os', 'path', 'querystring', 'querystring', 'stream', 'string_decoder', 'tls', 'tty', 'url', 'util', 'zlib']

function buildTypescriptPlugin(config: Config): Plugin {
  return rollupTypescript({
    cacheRoot: 'tmp/rts2_cache',
    useTsconfigDeclarationDir: true,
    typescript,
    tsconfig: config.tsConfig,
    tsconfigOverride: {
      compilerOptions: {
        module: 'esnext',
        target: 'ES2015'
      }
    }
  })
}

export async function compile(config: Config, resolveModules = false): Promise<void> {
  const inputOpts: InputOptions = {
    input: config.sources,
    plugins: [
      buildTypescriptPlugin(config),
      ...(resolveModules ? [resolve({preferBuiltins: true, dedupe: ['typedi', 'mongodb']}), commonjs(), json() as Plugin] : [])
    ],
    external: [...NODE_BUILTIN, 'mongodb', 'nnms', 'typedi', ...config.externals]
  }
  console.log(`🛠  bundle ${config.sources.map(src => `'${src}'`).join(', ')}`)
  const bundle = await rollup(inputOpts)
  console.log(`📁  create '${config.dist}'`)
  await p(mkdirp)(config.dist)
  console.log(`✏️  write cjs output`)
  await bundle.write({dir: config.dist, format: 'cjs'})
}
