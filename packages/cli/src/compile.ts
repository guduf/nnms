import { Argv } from 'yargs'
import { Plugin, InputOptions, rollup } from 'rollup'
import Command from './command'
import { loadConfig, Config } from './shared'
import rollupTypescript from 'rollup-plugin-typescript2'
import typescript from 'typescript'
import { promisify as p } from 'util'
import mkdirp from 'mkdirp'

export const COMPILE_COMMAND: Command<{ path?: string }> = {
  schema: 'compile',
  descr: 'Compile a N&M\'s application',
  argv: (yargs) => (
    (yargs as Argv<{ config?: string }>)
      .option('path', {
        type: 'string',
        alias: 'p',
        descr: 'The filepath of N&M\'s configuration'
      })
  ),
  cmd: async cmd => {
    const config = await loadConfig(cmd.path)
    await compile(config)
  }
}

function buildTypescriptPlugin(config: Config): Plugin {
  return rollupTypescript({
    cacheRoot: 'tmp/rts2_cache',
    useTsconfigDeclarationDir: true,
    typescript,
    tsconfig: config.tsConfig,
    tsconfigOverride: {
      compilerOptions: {
        module: 'esnext',
        target: 'ES2015',
        declaration: true,
        declarationDir: './types'
      }
    }
  })
}

export async function compile(config: Config): Promise<void> {
  const inputOpts: InputOptions = {
    input: config.sources,
    plugins: [buildTypescriptPlugin(config)]
  }
  const bundle = await rollup(inputOpts)
  console.log('mkdirp')
  await p(mkdirp)(config.dist)
  console.log('write')
  await bundle.write({dir: config.dist, format: 'cjs'})
}
