import { bootstrap, ModuleMeta, PREFIX } from 'nnms'
import { join } from 'path'


export async function runModules(file: string, opts = {} as { appName?: string, moduleNames?: string[] }) {
  let index = {} as { [key: string]: Function }
  try {
    index = require(file.match(/^\.?\.\//) ? join(process.cwd(), file) : file)
  } catch (err) {
    console.error(`failed to import index in '${file}'`)
    process.exit(1)
  }
  const mods = Object.keys(index).reduce((acc, key) => {
    const modMeta = Reflect.getMetadata(`${PREFIX}:module`, index[key])
    return {...acc, ...(modMeta instanceof ModuleMeta ? {[modMeta.name]: modMeta.type} : {})}
  }, {} as { [key: string]: Function })
  if (!Object.keys(mods).length) {
    console.error(`None module has been found in '${file}'`)
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
  bootstrap(appName, ...bootstrapedMods)
}
