const {bootstrap, Crash} = require('nnms')
const mods = process.argv.slice(2).map(path => {
  const [filepath, exportKey] = path.split('#')
  return require(filepath)[exportKey]
})
const events = require('nnms').bootstrap(...mods)
events.subscribe(e => process.send(e.serialize()))
process.on('unhandledRejection', err => {
  if (!(err instanceof Error)) err = new Error(`Unhandled rejection: ${err}`)
  process.send(Crash.serialize(err))
})
