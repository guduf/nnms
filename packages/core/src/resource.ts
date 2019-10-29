import { resolve } from 'path'
import { Observable } from 'rxjs'
import { Container, ContainerInstance, Token } from 'typedi'

import { Logger } from './log'
import { Event } from './event'
import Environment from './environment'
import { MethodMeta } from './method'

export const PREFIX = 'nnms'
export const PREFIX_UPPER = PREFIX.toUpperCase()

export const RESOURCE_CONTEXT_TOKEN = new Token<ResourceContext>('RESOURCE_CONTEXT')

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

/** represents common properties shared across resource meta */
export abstract class ResourceMeta<TVars extends Record<string, string> = {}> {
  static readonly __location = __dirname || resolve()

  constructor(
    /** class object of the resource*/
    readonly type: Function,
    {name, providers, vars}: ResourceOpts<TVars>
  ) {
    if (typeof this.type !== 'function') throw new Error('Invalid type')
    if (!NAME_REGEX.test(name)) throw new Error('Invalid module name')
    this.name = name
    this.vars = typeof vars === 'object' && vars ? vars : {} as TVars
    this.providers = (providers || []).map(type => {
      const providerMeta = getResourceMeta('provider', type)
      if (!providerMeta) throw new Error('missing provider meta')
      return providerMeta
    })
    const protoMeta = Reflect.getMetadata(`${PREFIX}:methods`, type.prototype) || {}
    this.methods = Object.keys(protoMeta).reduce((acc, key) => (
      {...acc, [key]: new MethodMeta(type.prototype, key, protoMeta[key])}
    ), {})
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
  abstract readonly kind: 'application' | ResourceKind

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

/** represents properties for application contexts */
export abstract class ApplicationContext extends CommonContext {
  /** identifier for application context kind */
  readonly kind: 'application'

  /** global environment of the application */
  readonly env: Environment

  /** generic output emmiter */
  readonly nextOutput: (e: Event) => void

  readonly inputs: Observable<Event>
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

/** returns the application context */
export function getContainerContext(): ApplicationContext

/** returns the resource context for a module scoped container */
export function getContainerContext(modContainer: ContainerInstance): ResourceContext

export function getContainerContext(modContainer?: ContainerInstance): ApplicationContext | ResourceContext {
  const container = modContainer || Container
  if (!container.has(RESOURCE_CONTEXT_TOKEN)) throw new Error('Container has no resource context')
  const ctx = container.get(RESOURCE_CONTEXT_TOKEN)
  return ctx
}

/** scans the instance prototype to get method metas for a plugin */
export function getMethodPluginMetas<T>(
  pluginName: string,
  instance: {}
): { [prop: string]: T } {
  const proto = Object.getPrototypeOf(instance)
  return Object.getOwnPropertyNames(proto).reduce((acc, prop) => {
    if (prop === 'constructor') return acc
    const meta = Reflect.getMetadata(`${PREFIX}:plugin:${pluginName}`, proto, prop)
    return {...acc, ...(meta ? {[prop]: meta} : {})}
  }, {} as { [prop: string]: T })
}


export function getResourceMeta<K extends 'module' | 'provider' | 'plugin'>(
  type: K,
  target: Function
): ResourceMeta | null {
  const meta = Reflect.getMetadata(`${PREFIX}:${type}`, target) as ResourceMeta
  if (meta && !(meta instanceof ResourceMeta)) {
    const foundCtor = ((meta as any).constructor || {}) as any
    throw new Error([
      `${type} meta is not a instance of ResourceMeta`,
      ...(ResourceMeta.__location ? [`  expected: ${ResourceMeta.__location}`] : []),
      ...(foundCtor.__location ? [`  found: ${foundCtor.__location}`] : [])
    ].join('\n'))
  }
  return meta || null
}
