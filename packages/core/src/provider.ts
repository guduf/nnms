import { getApplicationRef } from './module_ref'
import { PREFIX } from './common'
import { getClassMeta } from './di'
import { Logger } from './logger'

export interface ProviderOpts<TVars extends Record<string, string> = {}> {
  name: string
  providers?: Function[]
  vars?: TVars
}

const nameRegex = /^[\w-]{2,32}$/

export class ProviderMeta<TVars extends Record<string, string> = {}> {
  readonly name: string
  readonly vars: TVars
  readonly providers: ProviderMeta[]

  constructor(
    readonly type: Function,
    {name, vars, providers}: ProviderOpts<TVars>
  ) {
    if (typeof this.type !== 'function') throw new Error('Invalid type')
    if (!nameRegex.test(name)) throw new Error('Invalid module name')
    this.name = name
    this.vars = typeof vars === 'object' && vars ? vars : {} as TVars
    this.providers = (providers || []).map(type => getClassMeta('provider', type))
  }
}

export class ProviderContext<TVars extends Record<string, string> = {}> {
  readonly id: string
  readonly mode: 'dev' | 'prod' | 'test'
  readonly logger: Logger
  readonly vars: { readonly [P in keyof TVars]: string }

  constructor(meta: ProviderMeta<TVars>) {
    const {env, logger} = getApplicationRef()
    this.id = `${PREFIX}:module:${meta.name}`
    this.mode = env.isProduction ? 'prod' : 'dev'
    this.logger = logger.extend(meta.name)
    this.vars = env.extract(meta.vars, meta.name.toUpperCase())
  }
}

export function refDecorator<TVars extends Record<string, string>, TOpts extends ProviderOpts<TVars> = ProviderOpts<TVars>>(
  ref: 'provider' | 'module' | 'plugin',
  metaCtor: { new (ref: Function, opts: TOpts): ProviderMeta<TVars> }
): (opts: TOpts) => ClassDecorator {
  return opts => {
    return target => {
      const meta = new metaCtor(target, opts)
      Reflect.defineMetadata(`${PREFIX}:ref`, ref, target)
      Reflect.defineMetadata(`${PREFIX}:${ref}`, meta, target)
    }
  }
}

export const ProviderRef = refDecorator('provider', ProviderMeta)
