const argv = require('argv')
const { exec } = require('child_process')
const fs = require('fs')
const glob = require('glob')
const mkdirp = require('mkdirp')
const path = require('path')
const rimraf = require('rimraf')
const rollup = require('rollup')
const rollupTypescript = require('rollup-plugin-typescript2')
const ts = require('typescript')
const { promisify: p } = require('util')

const rootPkg = require('../package.json')
const { scanPackage } = require('./global')

argv.option({
  name: 'skipClean',
  type: 'boolean',
  description: 'Skip the deletion of the tempory build directory'
})

argv.option({
  name: 'skipClone',
  type: 'boolean',
  description: 'skip the copy of the pack in node modules'
})

argv.option({
  name: 'install',
  type: 'string',
  description: 'Install built packages'
})

function clean(tmpPath) {
  console.log(`🧹 Clean '${tmpPath}'`)
  return p(rimraf)(tmpPath)
}

async function build(scan, pkgName, options) {
  const tmpPath = path.join(process.cwd(), `tmp/build/${Date.now()}`)
  process.on('SIGINT', () => clean(tmpPath))
  try {
    const {basename, version} = scan
    if (!pkgName) throw new Error('Missing env CURRENT_PACKAGE')
    const meta = require(`../packages/${pkgName}/meta.json`)

    console.log(`👷 Build package '${pkgName}' in '${tmpPath}'`)

    const pkgFullName = `${basename}${pkgName === 'core' ? '' : `-${pkgName}`}`
    const tsConfigPath = path.join(process.cwd(), `packages/${pkgName}/tsconfig.json`)
    console.log({tsConfigPath})

    function buildTypescriptPlugin(declarationDir) {
      return rollupTypescript({
        cacheRoot: 'tmp/rts2_cache',
        useTsconfigDeclarationDir: true,
        typescript: ts,
        tsconfig: tsConfigPath,
        tsconfigOverride: {
          compilerOptions: {
            module: 'esnext',
            target: 'ES2015',
            declaration: true,
            declarationDir
          }
        }
      })
    }
    const externals = (meta.externals || [])
    const internals = (meta.internals || []).map(internal => basename + (internal === 'core' ? '' : `-${internal}`))
    const distPath = path.join(__dirname, '../dist')
    const pkgPath = path.join(__dirname, `../packages/${pkgName}`)
    const rollupOpts = {
      input: `${pkgPath}/src/index.ts`,
      external: ['child_process', 'fs', 'path', 'util', ...externals, ...internals],
      plugins: [buildTypescriptPlugin(tmpPath)]
    }
    const bundle = await rollup.rollup(rollupOpts)
    const pathPrefix = `${tmpPath}/bundles/${pkgFullName}`
    const outputs = [
      {file: `${pathPrefix}.cjs.js`, format: 'cjs'},
      {file: `${pathPrefix}.es.js`, format: 'es'}
    ]
    for (const output of outputs) {
      console.log(`🔨 Bundle to ${output.format}`)
      await bundle.write(output)
    }
    const peerDependencies = internals.reduce((acc, dep) => (
      {...(acc || {}), [dep]: version}
    ), null)
    const dependencies = externals.reduce((acc, dep) => (
      {...(acc || {}), [dep]: rootPkg.dependencies[dep]}
    ), null)
    const devDependencies = externals.reduce((acc, dep) => {
      const typingDep = `@types/${dep}`
      const typingVersion = rootPkg.devDependencies[typingDep]
      return typingVersion ? {...(acc || {}), [typingDep]: typingVersion} : acc
    }, null)
    const bin = (
      meta.bin ?
        meta.bin.reduce((acc, path) => ({...acc, [path]: `./bin/${path}`}), {}) :
        null
    )
    const pkgJson = {
      name: pkgFullName,
      version,
      licence: rootPkg.licence,
      author: rootPkg.author,
      repository: rootPkg.repository,
      main: `./bundles/${pkgFullName}.cjs.js`,
      module: `./bundles/${pkgFullName}.es.js`,
      types: 'index.d.ts',
      ...(bin ? {bin} : {}),
      ...(dependencies ? {dependencies} : {}),
      ...(peerDependencies ? {peerDependencies} : {}),
      ...(devDependencies ? {devDependencies} : {})
    }
    console.log(`🔨 Write package.json`)
    await p(fs.writeFile)(`${tmpPath}/package.json`, JSON.stringify(pkgJson, null, 2) + '\n')
    if (bin) {
      console.log(`📁 Create bin/`)
      await p(mkdirp)(`${tmpPath}/bin`)
      for (const key in bin) {
        console.log(`📎 Copy bin/${key}`)
        await p(fs.copyFile)(`${pkgPath}/bin/${key}`, `${tmpPath}/bin/${key}`)
        await p(exec)(`chmod +x ${tmpPath}/bin/${key}`)
      }
    }
    const assets = await p(glob)(`${pkgPath}/assets/*`)
    for (const asset of assets) {
      const relpath = path.relative(pkgPath, asset)
      const assetPath = `${tmpPath}/${relpath}`
      console.log(`📎 Copy ${relpath}`)
      await p(mkdirp)(path.dirname(assetPath))
      await p(fs.copyFile)(asset, assetPath)
    }
    console.log(`📎 Copy LICENSE.md`)
    await p(fs.copyFile)('LICENSE.md', `${tmpPath}/LICENSE.md`)
    console.log(`🔨 Pack ${pkgFullName}-${version}.tgz`)
    await p(exec)(`npm pack ${tmpPath}`, {cwd: distPath})
    if (options.install && options.install !== 'false') {
      console.log(`🔌  Install (${options.install}) ${pkgFullName}-${version}.tgz`)
      await p(exec)(`npm install --${options.install} ${distPath}/${pkgFullName}-${version}.tgz`)
    }
    else if (!options.skipClone) {
      const clonePath = path.join(process.cwd(), `node_modules/${pkgFullName}`)
      console.error(`📋  Clone in ${clonePath}`)
      await p(rimraf)(`${clonePath}`)
      await p(mkdirp)(clonePath)
      await p(exec)(`cp -R ${tmpPath}/. ${clonePath}`)
      if (bin) {
        const cloneBinPath = path.join(clonePath, '../.bin')
        await p(exec)(`cp -R ${clonePath}/bin/. ${cloneBinPath}`)
      }
    }
    if (!options.skipClean) clean(tmpPath)
  } catch (err) {
    console.error(`❗️ Build failed: ${err}`)
    clean(tmpPath)
    process.exit(1)
  }
}

(async () => {
  const scan = await scanPackage()
  try {
    await p(mkdirp)('./tmp')
    await p(mkdirp)('./dist')
  } catch(err) {
    console.error(`❗️ Create folders failed: ${err.message}`)
    process.exit(1)
  }
  const {targets, options} = argv.run()
  for (const target of targets.length ? targets : scan.packages) {
    await build(scan, target, options)
  }
})().catch(console.error)
