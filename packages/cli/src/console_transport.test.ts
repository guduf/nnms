import chalk from 'chalk'
import moment from 'moment'

import { LoggerEvent, LOGGER_LEVELS } from 'nnms'

import ConsoleTransport from './console_transport'

test('new ConsoleTransport() should work with minimal arguments', () => {
  expect(() => new ConsoleTransport({log : () => {}})).not.toThrowError()
})

const getDataLines: ConsoleTransport['_getDataLines'] = (
  (ConsoleTransport.prototype as any)._getDataLines)

test('ConsoleTransport._getDataLines() should work', () => {
  const yaml = `📖\n📖`
  const deserializeYamlSpy = jest.fn(() => yaml)
  const spy = {_deserializeYaml : deserializeYamlSpy}
  const linePrefix = chalk.keyword(LOGGER_LEVELS['info'].color)('| ')
  const data = {fruit: '🍍'}
  expect(getDataLines.call(spy, chalk.white, data))
    .toEqual(yaml.split(/\n/g).map(line => linePrefix + chalk.grey(line)))
  expect(deserializeYamlSpy).toHaveBeenLastCalledWith(data)
  expect(deserializeYamlSpy).toBeCalledTimes(1)
})

const getLevelPrefix: ConsoleTransport['_getLevelPrefix'] = (
  (ConsoleTransport.prototype as any)._getLevelPrefix
)

test('ConsoleTransport._getLevelPrefix() should work whith valid argument', () => {
  const level = 'error'
  expect(getLevelPrefix(level))
    .toBe(chalk.bgKeyword(LOGGER_LEVELS[level].color)(` ${chalk.black('ERR')} `))
})

const getTimePrefix: ConsoleTransport['_getTimePrefix'] = (
  (ConsoleTransport.prototype as any)._getTimePrefix
)

test('ConsoleTransport._getTimePrefix() should work whith minimal arguments', () => {
  const mom = moment()
  expect(getTimePrefix.call({_cfg: {}}, mom)).toBe(chalk.grey(mom.format('HH:mm:ss')))
})

test('ConsoleTransport._getTimePrefix() should work whith valid arguments', () => {
  const mom = moment()
  expect(getTimePrefix.call({_cfg: {printDay: true}}, mom)).toBe(chalk.grey(mom.format('YYYY-MM-DD HH:mm:ss')))
})

const getUriPrefix: ConsoleTransport['_getUriPrefix'] = (
  (ConsoleTransport.prototype as any)._getUriPrefix
)

test('ConsoleTransport._getUriPrefix() should work whith valid argument', () => {
  const uri = ['foo', 'bar']
  expect(getUriPrefix(uri)).toBe(chalk.magenta(uri.join('/')))
})

const render: ConsoleTransport['_render'] = (
  (ConsoleTransport.prototype as any)._render
)

const [levelPrefix, timePrefix, uriPrefix, message]= ['🌈', '⏲', '🗺', '🔠']

/* eslint-disable-next-line @typescript-eslint/explicit-function-return-type */
const setupRenderMock = (dataLines?: string[]) => {
  return {
    _getLevelPrefix: jest.fn(() => levelPrefix),
    _getTimePrefix: jest.fn(() => timePrefix),
    _getUriPrefix: jest.fn(() => uriPrefix),
    _getDataLines: jest.fn(() => dataLines)
  }
}

test('ConsoleTransport.render() should work whith event without data', () => {
  const mock = setupRenderMock()
  const e: LoggerEvent = {level: 'debug', uri: ['test'], message}

  expect(render.call(mock, e)).toEqual([timePrefix, levelPrefix, uriPrefix, message].join(' ') + '\n')
  expect(mock._getLevelPrefix).toBeCalledTimes(1)
  expect(mock._getLevelPrefix).lastCalledWith(e.level)
  expect(mock._getTimePrefix).toBeCalledTimes(1)
  expect(mock._getUriPrefix).toBeCalledTimes(1)
  expect(mock._getUriPrefix).lastCalledWith(e.uri)
})

test('ConsoleTransport.render() should work whith event with data', () => {
  const dataLines = ['📘', '📙']
  const mock = setupRenderMock(dataLines)
  const e: LoggerEvent = {level: 'debug', uri: ['test'], message, data: {fruit: '🍐'}}
  const headerLine = [timePrefix, levelPrefix, uriPrefix, message].join(' ')
  expect(render.call(mock, e)).toEqual([headerLine, ...dataLines, ''].join('\n'))
  expect(mock._getLevelPrefix).toBeCalledTimes(1)
  expect(mock._getTimePrefix).toBeCalledTimes(1)
  expect(mock._getUriPrefix).toBeCalledTimes(1)
  expect(mock._getDataLines).toBeCalledTimes(1)
  expect(mock._getDataLines).lastCalledWith(e.level, e.data)

})
