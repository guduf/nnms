const argv = require('argv')
const path = require('path')
const { scanPackage } = require('./global')
const rootPkg = require('../package.json')
const { promisify: p } = require('util')
const { exec } = require('child_process')

argv.option({
  name: 'push',
  type: 'boolean',
  description: 'Push the docker image',
  default: false
})

async function buildImage(scan, options) {
  if (!rootPkg.dockerRepository) throw new Error('invalid docker repository')
  const tag = `${rootPkg.dockerRepository}:${scan.version}`
  console.log(`👷 Build docker image ${tag}`)
  const dockerPath = path.join(__dirname, '../docker')
  await p(exec)(`docker build ${dockerPath} --tag ${tag} --build-arg NNMS_VERSION=${scan.version}`)
  if (options.push) await pushImage(tag)
}

async function pushImage(tag) {
  console.log(`👷 Push docker image ${tag}`)
  await p(exec)(`docker push ${tag}`)
}

(async () => {
  const scan = await scanPackage()
  const {options} = argv.run()
  try {
    await buildImage(scan, options)
  } catch (err) {
    console.error(`❗️ Build docker image failed: ${err}`)
    setImmediate(() => process.exit(1))
  }
})().catch(console.error)
