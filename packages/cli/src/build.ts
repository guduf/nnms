import { spawn } from 'child_process'
import { access } from 'fs'
import { join } from 'path'
import { promisify as p } from 'util'
import { fromEvent } from 'rxjs'
import { tap } from 'rxjs/operators'
import { merge } from 'rxjs'
import Command from './command'
import { Argv } from 'yargs'
import { loadConfig } from './shared'

export const BUILD_COMMAND: Command<{ path?: string }> = {
  schema: 'build [file] [options]',
  descr: 'Build a docker for image N&M\'s application',
  argv: (yargs) => (
    (yargs as Argv<{ file: string }>)
    .option('path', {
      type: 'string',
      alias: 'p',
      descr: 'The filepath of N&M\'s configuration'
    })
  ),
  cmd: async cmd => {
    const config = await loadConfig(cmd.path)
    const id = await buildImage({
      context: config.root,
      tag: config.app
    })
    console.log({id})
  }
}

export interface BuildImageOpts {
  context: string
  tag: string
}

export async function buildImage({context, tag}: BuildImageOpts): Promise<string> {
  const imageTag = 'latest'
  join(__dirname, '../assets/Dockerfile')
  const dockerFile = '/Users/guduf/Projects/nnms/packages/cli/assets/Dockerfile'
  await p(access)(dockerFile)
  console.log(`nnms tag '${imageTag}'`)
  const process = spawn(
    'docker',
    ['build', context, '--tag', tag, '--file', dockerFile, '--build-arg', `NNMS_TAG=${imageTag}`]
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
