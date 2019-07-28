import { Service } from 'typedi'
import { ModuleRef, ModuleContext, bootstrap, Logger, PluginRef, PluginContext } from 'nandms'

const fruits = ['🍎', '🍑', '🍐'] as const
type Fruit = typeof fruits[number]
type FruitStock = { [P in Fruit]: number }

export function randomFruit(): Fruit {
  return fruits[Math.floor(Math.random() * fruits.length)]
}

@Service()
export class FruitService {
  readonly _stock: FruitStock = {'🍎': 1, '🍑': 2, '🍐': 3}

  get stock(): FruitStock { return {...this._stock} }

  add(fruit: Fruit): void { this._stock[fruit] += 1 }
  has(fruit: Fruit): boolean { return this._stock[fruit] >= 1 }
  remove(fruit: Fruit): void {
    if (this._stock[fruit] < 1) throw new Error(`Empty stock '${fruit}'`)
    this._stock[fruit] -= 1
  }
}

const EMITTER_VARS = {
  INTERVAL: ''
} as const

@PluginRef({name: 'market', vars: EMITTER_VARS})
export class MarketPlugin {
  readonly logger: Logger
  readonly vars: typeof EMITTER_VARS

  constructor(ctx: PluginContext) {
    console.log(ctx)
  }
}

@ModuleRef({name: 'fruits', plugins: [MarketPlugin]})
export class FruitModule {
  constructor(ctx: ModuleContext, service: FruitService) {
    ctx.logger.info('Initial stock', {items: service.stock})
  }
}

bootstrap('fruit-example', FruitModule)
