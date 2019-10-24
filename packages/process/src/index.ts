export * from './config'
export * from './log_format'
export * from './module_map'
export * from './module_run'

import { runModules } from './module_run'

if (process.mainModule && process.mainModule.filename === __filename) runModules().catch(console.error)
