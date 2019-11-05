import { spawn } from 'child_process'
import { access, lstat } from 'fs'
import { join } from 'path'
import { promisify as p } from 'util'
import { fromEvent } from 'rxjs'
import { tap } from 'rxjs/operators'
import { merge } from 'rxjs'
import { Argv } from 'yargs'

import { loadConfig } from 'nnms-process'

import Command from '../command'
import { getNNMSVersion } from '../shared'

const DEFAULT_BUILDER_IMAGE = 'guduf/nnms'
const DEFAULT_RUNNER_IMAGE_TAG = 'node:carbon-alpine'

export const BUILD_COMMAND: Command<{ path?: string, tag?: string, builder?: string, runner?: string }> = {
  schema: 'build [file] [options]',
  descr: 'Build a docker for image N&M\'s application',
  argv: (yargs) => (
    (yargs as Argv<{ file: string }>)
      .option('path', {
        type: 'string',
        alias: 'p',
        descr: 'The filepath of N&M\'s configuration'
      })
      .option('tag', {
        type: 'string',
        alias: 't',
        descr: 'The tag for the built image'
      })
      .option('builder', {
        type: 'string',
        alias: 'b',
        descr: 'The N&M\'s base image'
      })
      .option('runner', {
        type: 'string',
        alias: 'r',
        descr: 'The N&M\'s base image'
      })
  ),
  cmd: async cmd => {
    const config = await loadConfig(cmd.path)
    const nodeExternals = ['nnms', 'typedi', ...config.externals]
    const id = await buildImage({
      context: config.root,
      appTag: cmd.tag || config.app,
      builderImage: cmd.builder || `${DEFAULT_BUILDER_IMAGE}:${getNNMSVersion()}`,
      runnerImage: cmd.runner || DEFAULT_RUNNER_IMAGE_TAG,
      nodeExternals
    })
    console.log({id})
  }
}

export interface BuildImageOpts {
  context: string
  appTag: string
  builderImage: string
  runnerImage: string
  nodeExternals: string[]
}

export async function buildImage(
  {context, appTag, builderImage, runnerImage, nodeExternals}: BuildImageOpts
): Promise<string> {
  const dockerFile = join(__dirname, '../assets/Dockerfile')
  await p(access)(dockerFile)
  await p(lstat)(context)
  console.log(`🖼 builder image '${builderImage}'`)
  console.log(`🖼 runner image '${runnerImage}'`)
  const process = spawn(
    'docker',
    [
      'build',
      context,
      '--tag', appTag,
      '--file', dockerFile,
      '--build-arg', `BUILDER_IMAGE=${builderImage}`,
      '--build-arg', `RUNNER_IMAGE=${runnerImage}`,
      '--build-arg', `NODE_EXTERNALS=${nodeExternals.join(' ')}`,
    ]
  )
  let imageId = ''
  const subscr = merge(
    fromEvent<Buffer>(process.stdout, 'data').pipe(tap(e => {
      if (/addafz/.test(e as any)) {
        imageId = 'aze'
      }
      console.log(e.toString())
    })),
    fromEvent<Buffer>(process.stderr, 'data').pipe(tap(e => {
      console.error(e.toString())
    }))
  ).subscribe()
  const exitCode = await fromEvent<[number]>(process, 'close').toPromise()
  console.log({exitCode})
  subscr.unsubscribe()
  if (exitCode) throw new Error(`process exits with error code ${exitCode}`)
  if (!imageId) throw new Error(`cannot retrieve image id`)
  return imageId
}
