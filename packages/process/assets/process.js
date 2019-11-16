let nnms
try {
  const cwdPath = join(process.cwd(), './node_modules/nnms')
  const stat = statSync(cwdPath)
  if (!stat.isDirectory()) throw new Error('not directory')
  nmms = require(cwdPath)
} catch (err) {
  nnms = require('nnms')
}
const {bootstrap, Crash, Event} = nnms
const mods = process.argv.slice(2).map(path => {
  const [filepath, exportKey] = path.split('#')
  return require(filepath)[exportKey]
})
const {nextInput, outputs} = bootstrap(...mods)
outputs.subscribe(e => process.send(e.serialize()))
process.on('message', ({data}) => nextInput(Event.deserialize(Buffer.from(data))))
process.on('unhandledRejection', err => {
  if (!(err instanceof Error)) err = new Error(`Unhandled rejection: ${err}`)
  process.send(Crash.serialize(err))
})
