const { Crash, Event, ModuleMeta } = require('nnms')

if (typeof process.send !== 'function') {
  console.error('process.send is not a function')
  process.exit(1)
}
process.on('message', filepath => {
  try {
    source = require(filepath)
  } catch (err) {
    process.send(Crash.serialize(err))
    process.exit(1)
  }
  const map = Object.keys(source).reduce((acc, exportKey) => {
    const modMeta = Reflect.getMetadata('nnms:module', source[exportKey])
    if (!modMeta) return acc
    if (modMeta && !(modMeta instanceof ModuleMeta)) {
      process.send(Crash.serialize(new Error('module meta is not a instance of ModuleMeta')))
      process.exit(1)
    }
    return {...acc, [modMeta.name]: {...modMeta, path: `${filepath}#${exportKey}`, }}
  }, {})
  process.send(Event.serialize('MAP', JSON.stringify(map)))
  process.exit(0)
})
