/* eslint-disable */
const path = require('path')

module.exports = {
  roots: ['<rootDir>/src'],
  transform: {'^.+\\.tsx?$': 'ts-jest'},
  globals: {
    'ts-jest': {
      tsConfig: '<rootDir>/tsconfig.test.json',
      esModuleInterop: true
    }
  },
  coverageDirectory: path.join(process.cwd(), 'tmp/coverage/core')
}
