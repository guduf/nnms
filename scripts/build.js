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


function copy(tmpPath) {
  console.log(`🔨 Copy`)
  return p(fs.copyFile)('LICENSE.md', `${tmpPath}/LICENSE.md`)
}


function pack(tmpPath, tarballPath) {
  console.log(`🔨 Pack '${tarballPath}'`)
  return p(exec)(`npm pack ${tmpPath}`, {cwd: path.dirname(tarballPath)})

}

async function install(...tarballs) {
  console.log(`🔨 Install${tarballs.map(p => ` '${p}'`)}`)
  await p(exec)(`npm install --no-save${tarballs.map(p => ` ${p}`)}`)
}

async function build(scan, pkgName, tmpPath) {
  const {basename, version} = scan
  if (!pkgName) throw new Error('Missing env CURRENT_PACKAGE')
  const meta = require(`../packages/${pkgName}/meta.json`)

  console.log(`👷 Build package '${pkgName}' in '${tmpPath}'`)

  const pkgFullName = `${basename}${pkgName === 'core' ? '' : `-${pkgName}`}`
  const tsConfigPath = path.join(process.cwd(), `packages/${pkgName}/tsconfig.json`)

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
  const distPath = path.join(process.cwd(), './dist')
  const internalTarballs = (
    internals.length ?
      internals.map(targetName => (`${distPath}/${targetName}-${version}.tgz`)) :
      null
  )
  if (internalTarballs) try { await install(...internalTarballs) } catch (err) {
    throw new Error('failed to install internal dependencies')
  }
  const rollupOpts = {
    input: `packages/${pkgName}/src/index.ts`,
    external: ['fs', 'path', 'util', ...externals, ...internals],
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
  if (bin) {
    await p(fs.mkdir)(`${tmpPath}/bin`)
    for (const key in bin) await p(fs.copyFile)(
      path.join(process.cwd(), `packages/${pkgName}/bin/${key}`),
      `${tmpPath}/bin/${key}`
    )
    console.log(`🔨 Copy bin`)
  }
  await p(fs.writeFile)(`${tmpPath}/package.json`, JSON.stringify(pkgJson, null, 2) + '\n')
  await copy(tmpPath)
  const tarballPath = path.join(process.cwd(), `./dist/${pkgFullName}-${version}.tgz`)
  await pack(tmpPath, tarballPath)
}

function clean(tmpPath) {
  console.log(`🧹 Clean '${tmpPath}'`)
  return p(rimraf)(tmpPath)
}

(async () => {
  const scan = await scanPackage()
  try {
    await p(mkdirp)('./tmp')
    await p(mkdirp)('./dist')
  } catch(err) {
    console.error(`❗️ Init failed: ${err.message}`)
    process.exit(1)
  }
  const outdatedFiles = await p(glob)(`./dist/*[!${scan.version}]*`)
  for (const outdatedFile of outdatedFiles) await p(fs.unlink)(outdatedFile)
  let {targets, options} = argv.run()
  if (!targets.length) {
    targets = scan.packages
  }
  for (const target of targets) {
    const tmpPath = path.join(process.cwd(), `tmp/build/${Date.now()}`)
    try {
      await build(scan, target, tmpPath)
    } catch (err) {
      console.error(`❗️ Build failed: ${err}`)
      if (!options.skipClean) clean(tmpPath)
      setImmediate(() => process.exit(1))
      break
    }
    if (!options.skipClean) clean(tmpPath)
  }
})().catch(console.error)
