const argv = require('argv')
const rollup = require('rollup')
const rollupTypescript = require('rollup-plugin-typescript2')
const rootPkg = require('../package.json')
const fs = require('fs')
const { promisify: p } = require('util')
const rimraf = require('rimraf')
const ts = require('typescript')
const path = require('path')
const { exec } = require('child_process')
const {BASENAME, PACKAGES} = require('./global')
const mkdirp = require('mkdirp')

argv.option({
  name: 'skipClean',
  type: 'boolean',
  description: 'Skip the deletion of the tempory build directory'
})

argv.option({
  name: 'skipInstall',
  type: 'boolean',
  description: 'Skip the installation of the node package in the repository'
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

async function build(pkgName, tmpPath, opts) {
  const version = rootPkg.version
  if (!pkgName) throw new Error('Missing env CURRENT_PACKAGE')
  const meta = require(`../packages/${pkgName}/meta.json`)

  console.log(`👷 Build package '${pkgName}' in '${tmpPath}'`)

  const pkgFullName = `${BASENAME}${pkgName === 'core' ? '' : `-${pkgName}`}`
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
  const internals = (meta.internals || []).map(internal => BASENAME + (internal === 'core' ? '' : `-${internal}`))
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
  const peerDependencies = internals.reduce((acc, dep) => ({
    ...(acc || {}),
    [dep]: rootPkg.version
  }), null)
  const dependencies = externals.reduce((acc, dep) => ({
    ...(acc || {}),
    [dep]: rootPkg.dependencies[dep]
  }), null)
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
    ...(peerDependencies ? {peerDependencies} : {})
  }
  if (bin) {
    p(fs.mkdir)(`${tmpPath}/bin`)
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
  // if (!opts.skipInstall) await install(tarballPath)
}

function clean(tmpPath) {
  console.log(`🧹 Clean '${tmpPath}'`)
  return p(rimraf)(tmpPath)
}

(async () => {
  try {
    await p(mkdirp)('./tmp')
    await p(mkdirp)('./dist')
  } catch(err) {
    console.error(`❗️ Init failed: ${err.message}`)
    process.exit(1)
  }
  let {targets, options} = argv.run()
  if (!targets.length) {
    targets = PACKAGES
  }
  for (const target of targets) {
    const tmpPath = path.join(process.cwd(), `tmp/build/${Date.now()}`)
    try {
      await build(target, tmpPath, options)
    } catch (err) {
      console.error(`❗️ Build failed: ${err}`)
      if (!options.skipClean) clean(tmpPath)
      setImmediate(() => process.exit(1))
      break
    }
    if (!options.skipClean) clean(tmpPath)
  }
})().catch(console.error)
