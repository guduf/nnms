import { Service } from 'typedi'

export interface ModuleOpts<TVars extends Record<string, string> = {}> {
  name: string
  vars: TVars
}

const moduleNameRegex = /^[\w-]{2,32}$/

export interface ModuleMeta<TVars extends Record<string, string> = {}> {
  readonly name: string
  readonly vars: TVars
}

export function ModuleRef(arg: string | ModuleOpts): ClassDecorator {
  return ((target: Function) => {
    const opts = typeof arg === 'string' ? {name: arg, vars: {}} : arg
    if (!moduleNameRegex.test(opts.name)) throw new Error('Invalid module name')
    Reflect.defineMetadata('nandms:module', opts, target)
    Service(opts.name)(target)
  }) as ClassDecorator
}
