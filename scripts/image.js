const path = require('path')
const { scanPackage } = require('./global')
const rootPkg = require('../package.json')
const { promisify: p } = require('util')
const { exec } = require('child_process')

async function buildImage(scan) {
  if (!rootPkg.dockerRepository) throw new Error('invalid docker repository')
  const tag = `${rootPkg.dockerRepository}:${scan.version}`
  console.log(`👷 Build docker image ${tag}`)
  const dockerPath = path.join(__dirname, '../docker')
  await p(exec)(`docker build ${dockerPath} --tag ${tag} --build-arg NNMS_VERSION=${scan.version}`)
}

(async () => {
  const scan = await scanPackage()
  try {
    await buildImage(scan)
  } catch (err) {
    console.error(`❗️ Build docker image failed: ${err}`)
    setImmediate(() => process.exit(1))
  }
})().catch(console.error)
