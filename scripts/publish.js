const argv = require('argv')
const { promisify: p } = require('util')
const { exec } = require('child_process')
const { scanPackage } = require('./global')

async function publish(scan, target) {
  const pkgVersion = scan.version
  const pkgName = scan.basename + (target === 'core' ? '' : `-${target}`)
  console.log(`👷 Publish package '${pkgName}@${pkgVersion}'`)
  await p(exec)(`npm publish ./dist/${pkgName}-${pkgVersion}.tgz`)
}

(async () => {
  let {targets} = argv.run()
  const scan = await scanPackage()
  if (!targets.length) {
    targets = scan.packages
  }
  for (const target of targets) {
    try {
      await publish(scan, target)
    } catch (err) {
      console.error(`❗️ Publish failed: ${err}`)
      setImmediate(() => process.exit(1))
      break
    }
  }
})().catch(console.error)
