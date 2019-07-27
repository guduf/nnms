import { Service } from 'typedi'

export interface ModuleOpts<TVars extends Record<string, string> = {}> {
  name: string
  vars: TVars
}

const moduleNameRegex = /^[\w-]{2,32}$/

export class ModuleMeta<TVars extends Record<string, string> = {}> {
  readonly name: string
  readonly vars: TVars

  constructor(opts: ModuleOpts<TVars>) {
    if (!moduleNameRegex.test(opts.name)) throw new Error(
      `Invalid module name '${opts.name}'`
    )
    this.name = opts.name
    this.vars = opts.vars
  }
}

export function ModuleRef(arg: string | ModuleOpts): ClassDecorator {
  return ((target: Function & { μMeta: ModuleMeta }) => {
    const opts = typeof arg === 'string' ? {name: arg, vars: {}} : arg
    target.μMeta = new ModuleMeta(opts)
    Service(target.μMeta.name)(target)
  }) as ClassDecorator
}
