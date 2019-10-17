const argv = require('argv')
const fs = require('fs')
const glob = require('glob')
const mkdirp = require('mkdirp')
const path = require('path')
const rollup = require('rollup')
const rollupTypescript = require('rollup-plugin-typescript2')
const ts = require('typescript')
const { promisify: p } = require('util')

const rootPkg = require('../package.json')
const { scanPackage } = require('./global')

async function dev(scan, pkgName) {
  const {basename, version} = scan
  if (!pkgName) throw new Error('Missing env CURRENT_PACKAGE')
  const meta = require(`../packages/${pkgName}/meta.json`)
  const pkgFullName = `${basename}${pkgName === 'core' ? '' : `-${pkgName}`}`
  const distPath = path.join(__dirname, `../node_modules/${pkgFullName}`)
  console.log(`👷 Dev package '${pkgName}' in '${distPath}'`)

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
  const bundlePath = path.join(distPath, `./bundles/${pkgFullName}.cjs.js`)
  const pkgPath = path.join(__dirname, `../packages/${pkgName}`)
  const rollupOpts = {
    input: `${pkgPath}/src/index.ts`,
    output: {file: bundlePath, format: 'cjs'},
    external: ['child_process', 'fs', 'path', 'util', ...externals, ...internals],
    plugins: [buildTypescriptPlugin(distPath)]
  }
  const watcher = rollup.watch(rollupOpts)
  watcher.on('event', e => console.log(e))
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
  await p(fs.writeFile)(`${distPath}/package.json`, JSON.stringify(pkgJson, null, 2) + '\n')
  if (bin) {
    console.log(`🔨 Create bin/`)
    await p(mkdirp)(`${distPath}/bin`)
    for (const key in bin) {
      console.log(`🔨 Copy bin/${key}`)
      await p(fs.copyFile)(`${pkgPath}/bin/${key}`, `${distPath}/bin/${key}`)
    }
  }
  const assets = await p(glob)(`${pkgPath}/assets/*`)
  for (const asset of assets) {
    const relpath = path.relative(pkgPath, asset)
    const assetPath = `${distPath}/${relpath}`
    console.log(`🔨 Copy ${relpath}`)
    await p(mkdirp)(path.dirname(assetPath))
    await p(fs.copyFile)(asset, assetPath)
  }
  console.log(`🔨 Copy LICENSE.md`)
  await p(fs.copyFile)('LICENSE.md', `${distPath}/LICENSE.md`)
}

(async () => {
  const scan = await scanPackage()
  const {targets: [target]} = argv.run()
  try {
    await dev(scan, target)
  } catch (err) {
    console.error(`❗️ Dev failed: ${err}`)
    setImmediate(() => process.exit(1))
  }
})().catch(console.error)
