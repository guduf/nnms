const argv = require('argv')
const { promisify: p } = require('util')
const { exec } = require('child_process')

function generateDoc(package) {
  console.log(`📖 Generate doc '${package}'`)
  return p(exec)(`
    npm run docs:generate ./packages/${package}/src -- \
      --out ./docs/${package} \
      --name nnms-${package} \
      --readme ./packages/${package}/README.md
  `)
}

(async () => {
  const {targets} = argv.run()
  for (const target of targets) {
    await generateDoc(target)
  }
})().catch(err => console.error(err))
