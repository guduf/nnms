import dotenv from 'dotenv'
import path from 'path'

export class Environment {
  readonly processEnv: { readonly [key: string]: string }

  get isProduction(): boolean {
    return this.processEnv['NODE_ENV'] === 'production'
  }

  constructor(
    processEnv: NodeJS.ProcessEnv = process.env
  ) {
    const isProduction = process.env['NODE_ENV'] !== 'development'
    dotenv.config({
      path: path.join(process.cwd(), '.env' + (!isProduction ? '.dev' : ''))
    })
    if (!isProduction) dotenv.config({path: path.join(process.cwd(), '.secret')})
    this.processEnv = Object.keys(processEnv).reduce((acc, key) => ({
      ...acc,
      ...(processEnv[key] ? {[String(key)]: String(processEnv[key])}: {})
    }), {})
    Object.freeze(this.processEnv)
  }

  extract<T extends { readonly [k: string]: string }>(template: T, prefix?: string): T {
    return Object.keys(template).reduce((acc, key) => {
      const processKey = key[0] === '$' ? key.slice(1) : prefix ? `${prefix}_${key}` : key
      const value = this.processEnv[processKey] || template[key]
      if (!value || typeof value !== 'string') throw new TypeError(
        `Missing Environment variable '${processKey}'`
      )
      return {...acc, [key]: value}
    }, {} as T)
  }
}

export default Environment
