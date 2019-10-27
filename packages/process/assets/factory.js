const { Crash, Event, getResourceMeta } = require('nnms')

if (typeof process.send !== 'function') {
  console.error('process.send is not a function')
  process.exit(1)
}
process.on('message', filepath => {
  try {
    source = require(filepath)
    const map = Object.keys(source).reduce((acc, exportKey) => {
      const modMeta = getResourceMeta('module', source[exportKey])
      if (!modMeta) return acc
      return {...acc, [modMeta.name]: {...modMeta, path: `${filepath}#${exportKey}`, }}
    }, {})
    process.send(Event.serialize('MAP', JSON.stringify(map)))
    process.exit(0)
  } catch (err) {
    process.send(Crash.serialize(err))
    process.exit(1)
  }
})
