import { Observable } from 'rxjs'

import { Bus, AbstractTopic } from './bus'
import { Event } from './event'
import Environment from './environment'
import { Logger } from './log'
import { reflectSchema } from './schema'
import { Crash } from './error'
import { registerParameter, injectContext } from './di'

export class RootContext {
    constructor(
      readonly id: string,
      readonly env: Environment,
      inputs: Observable<Event>,
      output: (e: Event) => void
    ) {
      const tags = {src: 'root', root: id}
      this.logger = new Logger(tags, log => output(log.toEvent()))
      this.crash = err => output(Crash.create(err, tags).toEvent())
      this.bus = new Bus(this.logger, inputs, output)
    }

    /** root logger for the whole process  */
    readonly logger: Logger

    /** crash emitter to exit process */
    readonly crash: (err: Error, tags?: Record<string, string>) => void

    /** crash emitter to exit process */
    readonly bus: Bus
}

export function Topic(target: Function, sub?: string): ParameterDecorator {
  return registerParameter(() => {
    const {bus} = injectContext<RootContext>()
    if (!(bus instanceof Bus)) throw new Error('invalid bus')
    const schema = reflectSchema(target)
    if (!schema) throw new Error('cannot reflect schema')
    return bus.buildTopic(sub || schema.id.slice(1), schema)
  })
}

export type Topic<T> = AbstractTopic<T>
