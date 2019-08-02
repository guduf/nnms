const argv = require('argv')
const rollup = require('rollup')
const rollupTypescript = require('rollup-plugin-typescript2')
const rootPkg = require('../package.json')
const fs = require('fs')
const { promisify: p } = require('util')
const rimraf = require('rimraf')
const ts = require('typescript')
const path = require('path')
const tar = require('tar')
const { exec } = require('child_process')

const PKG_BASENAME = 'nnms'

function copy(tmpPath) {
  console.log(`🔨 Copy`)
  return p(fs.copyFile)('LICENSE.md', `${tmpPath}/LICENSE.md`)
}

function package(tmpPath, tarballPath) {
  console.log(`🔨 Package to '${tarballPath}'`)
  return tar.c(
    {file: tarballPath, cwd: tmpPath, gzip: true},
    ['.']
  )
}

function install(tarballPath) {
  console.log(`🔨 Install '${tarballPath}'`)
  return p(exec)(`npm install --save-optional ./${tarballPath}`)
}

async function build(pkgName, tmpPath) {
  const version = rootPkg.version
  if (!pkgName) throw new Error('Missing env CURRENT_PACKAGE')
  const meta = require(`../packages/${pkgName}/meta.json`)

  console.log(`👷 Build package '${pkgName}' in '${tmpPath}'`)

  const pkgFullName = `${PKG_BASENAME}${pkgName === 'core' ? '' : `-${pkgName}`}`
  const tsConfigPath = path.join(process.cwd(), `packages/${pkgName}/tsconfig.json`)

  const tsPlugin = rollupTypescript({
    cacheRoot: 'tmp/rts2_cache',
    useTsconfigDeclarationDir: true,
    typescript: ts,
    tsconfig: tsConfigPath,
    tsconfigOverride: {
      compilerOptions: {
        module: 'ES2015',
        target: 'ES2015',
        declaration: true,
        declarationDir: tmpPath
      }
    }
  })
  const opts = {
    input: `packages/${pkgName}/src/index.ts`,
    external: ['path', ...(meta.externals || []), ...(meta.internals || [])],
    plugins: [tsPlugin]
  }
  const bundle = await rollup.rollup(opts);
  const cjsPath = `bundles/${pkgFullName}.cjs.js`
  const esPath = `bundles/${pkgFullName}.es.js`
  const outputs = [
    {file: `${tmpPath}/${cjsPath}`, format: 'cjs'},
    {file: `${tmpPath}/${esPath}`, format: 'es'}
  ]
  for (const output of outputs) {
    console.log(`🔨 Bundle to ${output.format}`)
    await bundle.write(output)
  }
  const internals = (meta.internals || []).reduce((acc, dep) => ({
    ...(acc || {}),
    [PKG_BASENAME + (dep === 'core' ? '' : `-${dep}`)]: rootPkg.version
  }), null)
  const externals = (meta.externals || []).reduce((acc, dep) => ({
    ...(acc || {}),
    [dep]: rootPkg.dependencies[dep]
  }), null)
  const pkgJson = {
    name: pkgFullName,
    version,
    licence: rootPkg.licence,
    author: rootPkg.author,
    repository: rootPkg.repository,
    main: cjsPath,
    module: esPath,
    types: 'index.d.ts',
    ...(externals ? {dependencies: externals} : {}),
    ...(internals ? {peerDependencies: internals} : {})
  }
  console.log(`🔨 Write package.json`)
  await p(fs.writeFile)(
    `${tmpPath}/package.json`,
    JSON.stringify(pkgJson, null, 2) + '\n'
  )
  await copy(tmpPath)
  const tarballPath = `dist/${pkgFullName}-${version}.tgz`
  await package(tmpPath, tarballPath)
  await install(tarballPath)
}

(async () => {
  const {targets} = argv.run()
  for (const target of targets) {
    const tmpPath = path.join(process.cwd(), `tmp/build/${Date.now()}`)
    try { await build(target, tmpPath) } catch (err) { console.error(`❗️ Build failed: ${err}`) }
    console.log(`🧹 Clean '${tmpPath}'`)
    p(rimraf)(tmpPath)
  }
})().catch(console.error)
