import { ModuleMeta, PREFIX, bootstrap } from 'nnms'
import { join } from 'path'

import SubjectTransport from './subject_transport'
import { render } from 'ink'
import NNMSUI from './ui'
import { createElement } from 'react'

export async function runModules(file: string, opts = {} as { appName?: string, moduleNames?: string[] }) {
  let index = {} as { [key: string]: Function }
  try {
    index = await import(file.match(/^\.?\.\//) ? join(process.cwd(), file) : file)
  } catch (err) {
    throw new Error('failed to import index')
  }
  const mods = Object.keys(index).reduce((acc, key) => {
    const modMeta = Reflect.getMetadata(`${PREFIX}:module`, index[key])
    if (!(modMeta instanceof ModuleMeta)) return acc
    return {...acc, ...(modMeta instanceof ModuleMeta ? {[modMeta.name]: modMeta.type} : {})}
  }, {} as { [key: string]: Function })
  const appName = opts.appName || 'app'
  const bootstrapedMods = (
    opts.moduleNames ?
      opts.moduleNames.map(modName => {
        if (!mods[modName]) {
          console.error(`Missing module with name '${modName}'. Loaded modules are: ${Object.keys(mods).map(modName => `'${modName}'`)}`)
          process.exit(1)
        }
        return mods[modName]
      }) :
      Object.keys(mods).map(modName => mods[modName])
  )
  const transport = new SubjectTransport()
  render(createElement(NNMSUI, {transport}))
  setTimeout(() => {
    bootstrap(
      {
        name: appName,
        loggerTransports: [transport]
      },
      ...bootstrapedMods
    )
  }, 0)
}
