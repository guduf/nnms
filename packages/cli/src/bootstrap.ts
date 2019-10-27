import 'reflect-metadata'
import path from 'path'
import { bootstrap, getResourceMeta, ModuleMeta, Event } from 'nnms'
import { Observable } from 'rxjs'

export function bootstrapFile(
  filePath: string,
  opts = {} as { appName?: string, moduleNames?: string[] }
): Observable<Event> {
  let index = {} as { [key: string]: Function }
  try {
    index = require(filePath.match(/^\.?\.\//) ? path.join(process.cwd(), filePath) : filePath)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
  const mods = Object.keys(index).reduce((acc, key) => {
    let modMeta = getResourceMeta('module', index[key])
    if (!modMeta) return acc
    if (!(modMeta instanceof ModuleMeta)) {
      console.error(`reflected meta of key '${key}' is not a instance of ModuleMeta`)
      process.exit(1)
    }
    return {...acc, [modMeta.name]: modMeta.type}
  }, {} as { [key: string]: Function })
  if (!Object.keys(mods).length) {
    console.error(`none module has been found in '${filePath}'`)
    process.exit(1)
  }
  const bootstrapedMods = (
    opts.moduleNames ?
      opts.moduleNames.map(modName => {
        if (!mods[modName]) {
          console.error(`missing module with name '${modName}'. Loaded modules are: ${Object.keys(mods).map(modName => `'${modName}'`)}`)
          process.exit(1)
        }
        return mods[modName]
      }) :
      Object.keys(mods).map(modName => mods[modName])
  )
  return bootstrap(...bootstrapedMods)
}
