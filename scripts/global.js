const rootPkg = require('../package.json')

const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

async function scanPackage() {
  console.log(`👷 Scan package.json`)
  const nameMatch = rootPkg.name.match(/^([\w-]+)-repo$/)
  if (!nameMatch) throw new Error('invalid name')
  const basename = nameMatch[1]
  if (!SEMVER_REGEX.test(rootPkg.version)) throw new Error('invalid name')
  const packages = rootPkg[`${basename}Packages`]
  if (!Array.isArray(packages)) throw new Error('invalid packages')
  if (packages[0] !== 'core') throw new Error('invalid core package')
  return {
    basename,
    packages,
    version: rootPkg.version,
    dependencies: rootPkg.dependencies,
    devDependencies: rootPkg.devDependencies
  }
}

module.exports = {
  scanPackage
}
