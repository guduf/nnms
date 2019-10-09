
import { Container, ContainerInstance, Token } from 'typedi'
import { Logger } from './logger'
import Environment from './environment'
import { Observable } from 'rxjs'
import { ModuleMetric } from './module_ref'
import { PluginMetric } from './plugin'
import { ProviderMetric } from './provider'

export const PREFIX = 'nnms'
export const PREFIX_UPPER = PREFIX.toUpperCase()

export const RESOURCE_CONTEXT_TOKEN = new Token<ResourceContext>('RESOURCE_CONTEXT')

const NAME_REGEX = /^[\w-]{2,32}$/

/** Represents common options shared across resources. */
export interface ResourceOpts<TVars extends Record<string, string> = {}> {
  /** The unique identifier for the resource. */
  name: string

  /**
   * The array of providers explicitly required by the resource.
   * @default []
   */
  providers?: ResourceMeta[]

  /**
   * The environment variable template of the resource.
   * @default {}
   */
  vars?: TVars
}

/** Represents common properties shared across resource meta. */
export abstract class ResourceMeta<TVars extends Record<string, string> = {}> {
  constructor(
    /** The class object of the resource*/
    readonly type: Function,
    {name, providers, vars}: ResourceOpts<TVars>
  ) {
    if (typeof this.type !== 'function') throw new Error('Invalid type')
    if (!NAME_REGEX.test(name)) throw new Error('Invalid module name')
    this.name = name
    this.vars = typeof vars === 'object' && vars ? vars : {} as TVars
    this.providers = providers || []
  }

  /** The unique identifier for the resource. */
  readonly name: string

  /** The environment variable template of the resource. */
  readonly vars: TVars

  /** The array of providers explicitly required by the resource. */
  readonly providers: ResourceMeta[]

  /** Creates the resource context. */
  abstract buildContext(container?: ContainerInstance): ResourceContext
}

/** Represents all kind of resources. */
export type ResourceKind = 'module' | 'plugin' | 'provider'

/** Represents common properties shared accross application and resource contexts. */
export abstract class CommonContext {
  /** The identifier for context kind. */
  abstract readonly kind: 'application' | ResourceKind

  /** The specific logger created for the resource. */
  readonly logger: Logger

  /** The unique identifier of the context. */
  readonly name: string

  protected constructor() {
    throw new Error('context cannot be injected without handler')
  }
}

/** Represents properties for application contexts. */
export abstract class ApplicationContext extends CommonContext {
  /** The identifier for application context kind. */
  readonly kind: 'application'

  /** The global environment of the application. */
  readonly env: Environment

  /** A observable of module status. */
  readonly modules: Observable<ModuleMetric[]>

  /** A observable of plugins status. */
  readonly plugins: Observable<PluginMetric[]>

  /** A observable of providers status. */
  readonly providers: Observable<ProviderMetric[]>
}

/** Represents properties for shared accross resource contexts. */
export abstract class ResourceContext<TVars extends Record<string, string> = {}> extends CommonContext {
  /** The identifier for resource context kind. */
  abstract readonly kind: ResourceKind

  /** The retrieved meta object of the resource */
  readonly meta: ResourceMeta<TVars>

  /** The environment variables template compiled for the resource. */
  readonly vars: { readonly [P in keyof TVars]: string }
}

/** Returns the application context. */
export function getContainerContext(): ApplicationContext

/** Returns the resource context for a module scoped container. */
export function getContainerContext(modContainer: ContainerInstance): ResourceContext

export function getContainerContext(modContainer?: ContainerInstance): ApplicationContext | ResourceContext {
  const container = modContainer || Container
  if (!container.has(RESOURCE_CONTEXT_TOKEN)) throw new Error('Container has no resource context')
  const ctx = container.get(RESOURCE_CONTEXT_TOKEN)
  return ctx
}

/** Scans the instance prototype to get method metas for a plugin. */
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
