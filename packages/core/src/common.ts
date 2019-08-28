
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

export interface ResourceOpts<TVars extends Record<string, string> = {}> {
  name: string
  providers?: ResourceMeta[]
  vars?: TVars
}

export abstract class ResourceMeta<TVars extends Record<string, string> = {}> {
  readonly name: string
  readonly vars: TVars
  readonly providers: ResourceMeta[]

  constructor(
    readonly type: Function,
    {name, providers, vars}: ResourceOpts<TVars>
  ) {
    if (typeof this.type !== 'function') throw new Error('Invalid type')
    if (!NAME_REGEX.test(name)) throw new Error('Invalid module name')
    this.name = name
    this.vars = typeof vars === 'object' && vars ? vars : {} as TVars
    this.providers = providers || []
  }

  abstract buildContext(container?: ContainerInstance): ResourceContext
}
export abstract class CommonContext {
  abstract readonly kind: 'application' | 'module' | 'provider' | 'plugin'
  readonly logger: Logger
  readonly name: string

  protected constructor() {
    throw new Error('context cannot be injected without handler')
  }
}

export abstract class ApplicationContext extends CommonContext {
  readonly kind: 'application'
  readonly env: Environment
  readonly modules: Observable<ModuleMetric[]>
  readonly plugins: Observable<PluginMetric[]>
  readonly providers: Observable<ProviderMetric[]>
}

export abstract class ResourceContext<TVars extends Record<string, string> = {}> extends CommonContext {
  abstract readonly kind: 'provider' | 'module' | 'plugin'
  readonly meta: ResourceMeta<TVars>
  readonly mode: 'dev' | 'prod' | 'test'
  readonly logger: Logger
  readonly vars: { readonly [P in keyof TVars]: string }
}

export function getContainerContext(): ApplicationContext
export function getContainerContext(modContainer: ContainerInstance): ResourceContext
export function getContainerContext(modContainer?: ContainerInstance): ApplicationContext | ResourceContext {
  const container = modContainer || Container
  if (!container.has(RESOURCE_CONTEXT_TOKEN)) throw new Error('Container has no resource context')
  const ctx = container.get(RESOURCE_CONTEXT_TOKEN)
  return ctx
}

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
