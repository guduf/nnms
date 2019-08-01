import Logger from './logger'

export const PREFIX = 'nnms'
export const PREFIX_UPPER = PREFIX.toUpperCase()

export interface CommonOpts<TVars extends Record<string, string> = {}> {
  name: string
  vars?: TVars
}

const nameRegex = /^[\w-]{2,32}$/

export interface CommonContext<TVars extends Record<string, string>> {
  readonly mode: 'dev' | 'prod' | 'test'
  readonly logger: Logger
  readonly vars: { readonly [P in keyof TVars]: string }
}

export abstract class CommonMeta<TVars extends Record<string, string>> {
  readonly name: string
  readonly vars: TVars

  constructor(
    readonly type: Function,
    {name, vars}: CommonOpts<TVars>
  ) {
    if (typeof this.type !== 'function') throw new Error('Invalid type')
    if (!nameRegex.test(name)) throw new Error('Invalid module name')
    this.name = name
    this.vars = typeof vars === 'object' && vars ? vars : {} as TVars
  }
}


export function commonDecorator(
  metaSuffix: 'module' | 'plugin',
  mapper: (target: any) => any
): ClassDecorator {
  return target => {
    const meta = mapper(target)
    Reflect.defineMetadata(`${PREFIX}:${metaSuffix}`, meta, target)
  }
}
