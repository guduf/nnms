
import { join } from 'path'
import semverRegex from 'semver-regex'

export function getNNMSVersion(): string {
  const npmConfig = require(join(__dirname, '../package.json')) as { version: string }
  const version = (npmConfig.version || '').replace(/^v/, '')
  if (!semverRegex().test(version)) throw new Error('invalid version')
  return version
}
