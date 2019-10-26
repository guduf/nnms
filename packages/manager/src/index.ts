export * from './config'
export * from './log_format'
export * from './module_map'
export * from './run'

import { runProcess } from './run'

if (process.mainModule && process.mainModule.filename === __filename) runProcess().catch(console.error)
