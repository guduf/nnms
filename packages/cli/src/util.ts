import { appendFileSync } from 'fs'

export function filelog(obj: {}) {
  appendFileSync(process.cwd() + '/tmp/log', new Date().toISOString() + ' ' + JSON.stringify(obj) + '\n');
}
