import { Provider, ProviderContext, ApplicationContext } from 'nnms'

Provider('eventbus', {})
class Eventbus {
  constructor(
    private readonly _ctx: ProviderContext,
    appCtx: ApplicationContext
  ) { }
}
