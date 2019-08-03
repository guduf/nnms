import { PREFIX, getApplicationRef } from './common'
import { Logger } from './logger'
import Container, { ContainerInstance } from 'typedi';

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
    {name, providers, vars}: ProviderOpts<TVars>
  ) {
    if (typeof this.type !== 'function') throw new Error('Invalid type')
    if (!nameRegex.test(name)) throw new Error('Invalid module name')
    this.name = name
    this.vars = typeof vars === 'object' && vars ? vars : {} as TVars
    this.providers = (providers || []).map(depType => {
      const paramMeta = Reflect.getMetadata(`${PREFIX}:provider`, depType)
      if (!(paramMeta instanceof ProviderMeta)) throw new Error('Invalid dep')
      return paramMeta
    })
  }

  inject(_: ContainerInstance): any {
    return Container.get(this.type)
  }

  injectContext(_: ContainerInstance): ProviderContext {
    const {env, logger} = getApplicationRef()
    return {
      id: `${PREFIX}:provider:${this.name}`,
      meta: this,
      mode: env.isProduction ? 'prod' : 'dev',
      logger: logger.extend(this.name),
      vars: env.extract(this.vars, this.name.toUpperCase())
    }
  }
}

export abstract class ProviderContext<TVars extends Record<string, string> = {}> {
  readonly id: string
  readonly meta: ProviderMeta<TVars>
  readonly mode: 'dev' | 'prod' | 'test'
  readonly logger: Logger
  readonly vars: { readonly [P in keyof TVars]: string }

  protected constructor() {
    throw new Error('context cannot be injected without handler')
  }
}

