import glob from 'glob'
import { JsonObject } from 'type-fest'

import  { promisify as p } from 'util'
import { fork } from 'child_process'
import { join } from 'path'
import { fromEvent } from 'rxjs'
import { first } from 'rxjs/operators'
import { Config } from './config'

export interface ResourceInfo {
  name: string
  vars: JsonObject
  providers: ResourceInfo[]
}

export interface ModuleInfo extends ResourceInfo {
  path: string
  plugins: ResourceInfo[]
}

export type ModuleMap = Record<string, ModuleInfo>

export async function mapModules({dist, root}: Config): Promise<ModuleMap> {
  const filepaths = await p(glob)(`${dist}/*.js`)
  if (!filepaths) throw new Error('no file in dist path')
  let map: ModuleMap = {}
  for (const filepath of filepaths) {
    const bootstraper = fork(join(__dirname, '../assets/mapper.js'), [], {cwd: root})
    setImmediate(() => bootstraper.send(filepath))
    const [result] = (
      await fromEvent(bootstraper, 'message').pipe(first()).toPromise()
    ) as [Error | ModuleMap]
    if (result instanceof Error) {
      console.error(`️️❗️ cannot load map for file '${filepath}': ${result.message}`)
      continue
    }
    if (!Object.keys(result).length) continue
    map = {...map, ...result}
  }
  return map
}
