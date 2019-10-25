import { fork } from 'child_process'
import glob from 'glob'
import { join } from 'path'
import { first } from 'rxjs/operators'
import { fromEvent } from 'rxjs'
import { JsonObject } from 'type-fest'
import  { promisify as p } from 'util'

import { Event, Crash } from 'nnms'

import { Config } from './config'
import { CrashFormat } from './crash_format'

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
  const crashFormat = new CrashFormat()
  const filepaths = await p(glob)(`${dist}/*.js`)
  if (!filepaths) throw new Error('❗️ no file matching pattern')
  let map: ModuleMap = {}
  for (const filepath of filepaths) {
    const bootstraper = fork(join(__dirname, '../assets/mapper.js'), [], {cwd: root})
    setImmediate(() => bootstraper.send(filepath))
    const [result] = (
      await fromEvent(bootstraper, 'message').pipe(first()).toPromise()
    ) as [{ type: Buffer, data: any }]
    const e = Event.deserialize(Buffer.from(result.data))
    if (e.type === 'CRA') {
      const crash = Crash.fromEvent(e)
      console.error(crashFormat.render(crash))
      console.error(`️️❗️ cannot load map for file '${filepath}'`)
      continue
    }
    const resultMap = JSON.parse(e.data.toString())
    if (!Object.keys(result).length) continue
    map = {...map, ...resultMap}
  }
  if (!Object.keys(map).length) throw new Error('no module found')
  return map
}
