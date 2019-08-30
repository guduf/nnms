import { ModuleRef, ModuleContext } from 'nnms'
import { HttpPlugin, HttpRoute } from 'nnms-http'
import { EventbusHandler, EventbusPlugin, EventbusProxy } from 'nnms-nats'
import { BehaviorSubject, timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { LoggerMetricItem } from 'nnms';

const FRUITS = ['apple', 'peach', 'peer', 'lemon'] as const

type Fruit = (typeof FRUITS)[number]

type Stock = Record<Fruit, number>

interface StockMetric extends LoggerMetricItem {
  fruit: Fruit
  count: number
}

@ModuleRef('stock', {}, EventbusPlugin)
export class StockModule {
  readonly init = this._init()

  private _state: BehaviorSubject<Stock>

  @EventbusHandler()
  getStock(): Promise<Stock> {
    return this._state.pipe(first()).toPromise()
  }

  constructor(
    private readonly _ctx: ModuleContext
  ) { }

  private async _init(): Promise<void> {
    const initialStock = await this._getInitialStock()
    this._state = new BehaviorSubject(initialStock)
    this._state.subscribe(stock => this._ctx.logger.metric({
      'stock': {
        metricKey: 'fruit',
        $upsert: Object.keys(stock).reduce((acc, fruit) => (
          [...acc, {fruit: fruit as Fruit, count: stock[fruit as Fruit]}]
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



@ModuleRef('delivery', {HTTP_PORT: '8082'}, HttpPlugin, EventbusPlugin)
export class DeliveryModule {
  readonly init = this._init()

  constructor(
    private _ctx: ModuleContext,
    @EventbusProxy()
    private readonly stock: StockModule
  ) { }

  private async _init(): Promise<void> {
    if (true) return
    this._ctx.logger.info('initial stock', await this.stock.getStock())
  }

  @HttpRoute({method: 'POST'})
  async order(command: Partial<Stock>): Promise<boolean> {
    return Boolean(command)
  }
}
