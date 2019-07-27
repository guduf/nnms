const rollup = require('rollup')
const rollupTypescript = require('rollup-plugin-typescript2')
const rootPkg = require('../package.json')
const fs = require('fs')
const { promisify: p } = require('util')
const rimraf = require('rimraf')
const ts = require('typescript')
const path = require('path')
const { exec } = require('child_process')
const tar = require('tar')

const PACKAGE_BASENAME = 'nandms'

async function compile(tmpPath, tsConfigPath) {
  console.log(`🔨 Compile to es5`)
  const opts = [
    `-p ${tsConfigPath}`,
    `--outDir ${tmpPath}/lib`,
    `--declarationDir ${tmpPath}`,
  ]
  const {error, stderr} = await (
    p(exec)(`./node_modules/.bin/tsc ${opts.join(' ')}`)
  )
  if (error) {
    console.error(stderr.toString())
    throw err
  }
}

function package(tmpPath, pkgFullName, version) {
  console.log(`🔨 Package`)
  return tar.c(
    {gzip: false, file: `dist/${pkgFullName}-${version}.tgz`},
    [tmpPath]
  )
}

function copy(tmpPath) {
  console.log(`🔨 Copy`)
  return p(fs.copyFile)('LICENSE.md', `${tmpPath}/LICENSE.md`)
}

function package(tmpPath, pkgFullName, version) {
  const tarballPath = `dist/${pkgFullName}-${version}.tgz`
  console.log(`🔨 Package to '${tarballPath}'`)
  return tar.c(
    {file: tarballPath, cwd: tmpPath},
    ['.']
  )
}

async function build(tmpPath) {
  const pkgName = process.env['CURRENT_PACKAGE']
  const version = rootPkg.version
  if (!pkgName) throw new Error('Missing env CURRENT_PACKAGE')
  const meta = require(`../packages/${pkgName}/meta.json`)

  console.log(`👷 Build package '${pkgName}' in '${tmpPath}'`)

  const pkgFullName = `${PACKAGE_BASENAME}${pkgName === 'core' ? '' : `-${pkgName}`}`
  const tsConfigPath = path.join(process.cwd(), `packages/${pkgName}/tsconfig.json`)

  await compile(tmpPath, tsConfigPath)

  const tsPlugin = rollupTypescript({
    cacheRoot: 'tmp/rts2_cache',
    typescript: ts,
    tsconfig: tsConfigPath,
    tsconfigOverride: {
      compilerOptions: {module: 'ES2015', target: 'ES2015', declaration: false}
    }
  })
  const opts = {
    input: `packages/${pkgName}/src/index.ts`,
    external: meta.external,
    plugins: [tsPlugin]
  }
  const bundle = await rollup.rollup(opts);
  const esPath = `bundles/${pkgFullName}.es.js`
  const outputs = [
    {file: `${tmpPath}/${esPath}`, format: 'es'}
  ]
  for (const output of outputs) {
    console.log(`🔨 Bundle to ${output.format}`)
    await bundle.write(output)
  }
  const external = meta.external.reduce((acc, dep) => ({
    ...acc,
    ...(dep.includes('/') ? {} : {[dep]: rootPkg.dependencies[dep]})
  }), {})
  const pkgJson = {
    name: pkgFullName,
    version,
    licence: rootPkg.licence,
    author: rootPkg.author,
    repository: rootPkg.repository,
    main: 'lib/index.js',
    module: esPath,
    types: 'index.d.ts',
    dependencies: external
  }
  console.log(`🔨 Write package.json`)
  await p(fs.writeFile)(
    `${tmpPath}/package.json`,
    JSON.stringify(pkgJson, null, 2) + '\n'
  )
  await copy(tmpPath)
  await package(tmpPath, pkgFullName, version)
}

(async () => {
  const tmpPath = path.join(process.cwd(), `tmp/build/${Date.now()}`)
  try { await build(tmpPath) } catch (err) { console.error(`❗️ Build failed: ${err}`) }
  console.log(`🧹 Clean '${tmpPath}'`)
  p(rimraf)(tmpPath)
})().catch(console.error)
