const argv = require('argv')
const rootPkg = require('../package.json')
const { promisify: p } = require('util')
const { exec } = require('child_process')
const { BASENAME, PACKAGES } = require('./global')

async function publish(target) {
  const pkgVersion = rootPkg.version
  const pkgName = BASENAME + (target === 'core' ? '' : `-${target}`)
  console.log(`👷 Publish package '${pkgName}@${pkgVersion}'`)
  await p(exec)(`npm publish ./dist/${pkgName}-${pkgVersion}.tgz`)
}

(async () => {
  let {targets} = argv.run()
  if (!targets.length) {
    targets = PACKAGES
  }
  for (const target of targets) {
    try {
      await publish(target)
    } catch (err) {
      console.error(`❗️ Publish failed: ${err}`)
      setImmediate(() => process.exit(1))
      break
    }
  }
})().catch(console.error)
