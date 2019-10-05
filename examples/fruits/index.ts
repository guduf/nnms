import { ModuleRef, ModuleContext } from 'nnms'
import { HttpPlugin, HttpRoute } from 'nnms-http'
import { EventbusHandler, EventbusPlugin, EventbusProxy } from 'nnms-nats'
import { BehaviorSubject, timer } from 'rxjs'
import { first } from 'rxjs/operators'
import { JsonObject } from 'type-fest'
import { MongoDbSchema, MongoDbProvider, MongoDb } from 'nnms-mongodb'

const FRUITS = ['apple', 'peach', 'peer', 'lemon'] as const

type FruitName = (typeof FRUITS)[number]

type Stock = Record<FruitName, number>

@MongoDbSchema({
  name: 'fruit',
  bsonType: 'object',
  required: ['name', 'count'],
  properties: {
    name: {bsonType: 'string'},
    count: {bsonType: 'int'}
  }
})
export class Fruit {
  name: string
  count: number
}

interface StockMetric extends JsonObject {
  fruit: FruitName
  count: number
}

@ModuleRef('stock', {}, MongoDbProvider, EventbusPlugin)
export class StockModule {
  constructor(
    private readonly _ctx: ModuleContext,
    @MongoDb(Fruit)
    private readonly _fruits: MongoDb<Fruit>
  ) { }

  readonly init = this._init()

  private _state: BehaviorSubject<Stock>

  @EventbusHandler()
  getStock(): Promise<Stock> {
    return this._state.pipe(first()).toPromise()
  }

  private async _init(): Promise<void> {
    const fruits = await this._fruits
    console.log(await fruits.find({}).toArray())
    const initialStock = await this._getInitialStock()
    this._state = new BehaviorSubject(initialStock)
    this._state.subscribe(stock => this._ctx.logger.metric({
      'stock': {
        $metricKey: 'fruit',
        $upsert: Object.keys(stock).reduce((acc, fruit) => (
          [...acc, {fruit: fruit as FruitName, count: stock[fruit as FruitName]}]
        ), [] as StockMetric[])
      }
    }))
  }

  private async _getInitialStock(): Promise<Stock> {
    await timer(2000).toPromise()
    const stock = FRUITS.reduce((acc, fruit) => ({
      ...acc,
      [fruit]: Math.floor(Math.random() * 10)
    }), {} as Stock)
    return stock
  }
}



@ModuleRef('delivery', {HTTP_PORT: '8082'}, HttpPlugin)
export class DeliveryModule {
  readonly init = this._init()

  constructor(
    private _ctx: ModuleContext,
    @EventbusProxy()
    private readonly stock: StockModule
  ) { }

  private async _init(): Promise<void> {
    this._ctx.logger.info('initial stock', await this.stock.getStock())
  }

  @HttpRoute({method: 'POST'})
  async order(command: Partial<Stock>): Promise<boolean> {
    return Boolean(command)
  }
}
