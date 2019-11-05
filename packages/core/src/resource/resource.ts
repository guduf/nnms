import { resolve } from 'path'
import { ContainerInstance } from 'typedi'

import { getPropsMeta, getClassMeta } from '../di'
import { Logger } from '../log'
import { MethodMeta, MethodOpts } from './method'

const NAME_REGEX = /^[\w-]{2,32}$/

/** represents common options shared across resources */
export interface ResourceOpts<TVars extends Record<string, string> = {}> {
  /** unique identifier for the resource */
  name: string

  /**
   * The array of providers explicitly required by the resource.
   * @default []
   */
  providers?: Function[]

  /**
   * The environment variable template of the resource.
   * @default {}
   */
  vars?: TVars
}

export function getResourceMeta<K extends 'module' | 'provider' | 'plugin'>(
  type: K,
  target: Function
): ResourceMeta | null {
  return getClassMeta(target, type)
}

/** represents common properties shared across resource meta */
export abstract class ResourceMeta<TVars extends Record<string, string> = {}> {
  static readonly __location = __dirname || resolve()

  constructor(
    /** class object of the resource*/
    readonly target: Function,
    {name, providers, vars}: ResourceOpts<TVars>
  ) {
    if (typeof this.target !== 'function') throw new Error('Invalid type')
    if (!NAME_REGEX.test(name)) throw new Error('Invalid module name')
    this.name = name
    this.vars = typeof vars === 'object' && vars ? vars : {} as TVars
    this.providers = (providers || []).map(type => {
      const providerMeta = getResourceMeta('provider', type)
      if (!providerMeta) throw new Error('missing provider meta')
      return providerMeta
    })
    const propsMeta = getPropsMeta<MethodOpts<any>>(target.prototype, 'methods')
    this.methods = Object.keys(propsMeta).reduce((acc, key) => {
      const meta = new MethodMeta(target.prototype, key, propsMeta[key])
      return {...acc, [meta.name]: meta}
    }, {} as Record<string, MethodMeta>)
  }

  /** unique identifier for the resource */
  readonly name: string

  /** environment variable template of the resource */
  readonly vars: TVars

  /** array of providers explicitly required by the resource */
  readonly providers: ResourceMeta[]

  readonly methods: Record<string, MethodMeta>

  /** creates the resource context */
  abstract buildContext(container?: ContainerInstance): ResourceContext
}

/** represents all kind of resources */
export type ResourceKind = 'module' | 'plugin' | 'provider'

/** represents common properties shared accross application and resource contexts */
export abstract class CommonContext {
  /** identifier for context kind */
  abstract readonly kind: ResourceKind

  /** specific logger created for the resource */
  readonly logger: Logger

  /** unique identifier of the context */
  readonly name: string

  /** crash emitter to exit process */
  readonly crash: (err: Error, tags?: Record<string, string>) => void

  protected constructor() {
    throw new Error('context cannot be injected without handler')
  }
}

/** represents properties for shared accross resource contexts */
export abstract class ResourceContext<TVars extends Record<string, string> = {}> extends CommonContext {
  /** identifier for resource context kind */
  abstract readonly kind: ResourceKind

  /** retrieved meta object of the resource */
  readonly meta: ResourceMeta<TVars>

  /** environment variables template compiled for the resource */
  readonly vars: { readonly [P in keyof TVars]: string }
}
