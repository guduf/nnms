import { BehaviorSubject, defer } from 'rxjs'

import { ProviderContext, ProviderMeta } from './provider'
import { ModuleContext, PluginContext, ModuleMeta, PluginMeta } from './module_ref'

export interface ModuleState {
  init: boolean
  context: ModuleContext<{}>
  plugins: { [name: string]: { init: boolean, context: PluginContext<{}> }
  }
}

export interface ProviderState {
  init: boolean
  context: ProviderContext<{}>
}

export abstract class ApplicationState {
  status: 'INERT' | 'BOOTSTRAP' | 'STARTED'
  mods: { [name: string]: ModuleState }
  providers: { [name: string]: ProviderState }
}

const INITIAL_STATE = {
  status: 'INERT',
  mods: {},
  providers: {}
} as ApplicationState


export class ApplicationBackground implements ApplicationState {
  readonly changes = defer(() => this._state)

  get status(): ApplicationState['status'] {
    return this.value.status
  }

  get mods(): ApplicationState['mods'] {
    return this.value.mods
  }

  get providers(): ApplicationState['providers'] {
    return this.value.mods
  }

  get value(): ApplicationState {
    return this._state.value
  }

  private readonly _state = new BehaviorSubject(INITIAL_STATE)
  registerModule(meta: ModuleMeta, init = false): void {
    this._state.next({
      ...this.value,
      mods: {...this.mods, [meta.name]: {init, context: meta.buildContext(), plugins: {}}}
    })
  }

  initModule(modMeta: ModuleMeta): void {
    this._state.next({
      ...this.value,
      mods: {
        ...this.mods,
        [modMeta.name]: {...this.mods[modMeta.name], init: true}
      }
    })
  }

  registerPlugin(modMeta: ModuleMeta, meta: PluginMeta, init = false): void {
    const plugins = {
      ...this.mods[modMeta.name].plugins,
      [meta.name]: {context: meta.buildPluginContext<{}>(modMeta), init}
    }
    this._state.next({
      ...this.value,
      mods: {
        ...this.mods,
        [modMeta.name]: {...this.mods[modMeta.name], plugins}
      }
    })
  }

  initPlugin(modMeta: ModuleMeta, meta: PluginMeta): void {
    const plugins = {
      ...this.mods[modMeta.name].plugins,
      [meta.name]: {...this.mods[modMeta.name].plugins[meta.name], init: true}
    }
    this._state.next({
      ...this.value,
      mods: {
        ...this.mods,
        [modMeta.name]: {...this.mods[modMeta.name], plugins}
      }
    })
  }

  registerProvider(meta: ProviderMeta, init = false): void {
    this._state.next({
      ...this.value,
      providers : {
        ...this.providers,
        [meta.name]: {init, context: meta.buildContext()}
      }
    })
  }

  initProvider(meta: ProviderMeta): void {
    this._state.next({
      ...this.value,
      providers : {
        ...this.providers,
        [meta.name]: {...this.providers[meta.name], init: true}
      }
    })
  }

  setStatus(status: ApplicationState['status']): void {
    this._state.next({...this.value, status})
  }
}

export default ApplicationBackground
