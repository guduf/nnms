import path from 'path'
import { bootstrap, ModuleMeta, PREFIX, LoggerEvent } from 'nnms'
import { Observable } from 'rxjs'

export function bootstrapFile(
  filePath: string,
  opts = {} as { appName?: string, moduleNames?: string[] }
): Observable<LoggerEvent> {
  let index = {} as { [key: string]: Function }
  try {
    index = require(filePath.match(/^\.?\.\//) ? path.join(process.cwd(), filePath) : filePath)
  } catch (err) {
    console.error(err)
    console.error(`failed to import index in '${filePath}'`)
    process.exit(1)
  }
  const mods = Object.keys(index).reduce((acc, key) => {
    const modMeta = Reflect.getMetadata(`${PREFIX}:module`, index[key])
    return {...acc, ...(modMeta instanceof ModuleMeta ? {[modMeta.name]: modMeta.type} : {})}
  }, {} as { [key: string]: Function })
  if (!Object.keys(mods).length) {
    console.error(`None module has been found in '${filePath}'`)
    process.exit(1)
  }
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
  return bootstrap(appName, ...bootstrapedMods).logger.events
}
