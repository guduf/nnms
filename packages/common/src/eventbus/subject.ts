import { InteropObservable, Observable } from 'rxjs'

import { BsonValue, decorateParameter, injectProvider, reflectSchema } from 'nnms'

import { Eventbus } from './eventbus'

export interface BusSubject<T extends BsonValue = BsonValue> extends InteropObservable<T> {
  next: (value: T) => void
  pipe: Observable<T>['pipe']
  subscribe: Observable<T>['subscribe']
  complete: () => void
}

export function BusSubject<T extends BsonValue>(
  target: Function,
  id?: string
): ParameterDecorator {
  const schema = reflectSchema(target)
  if (!schema) throw new Error('cannot reflect target schema')
  const subId = id || schema.id.slice(1)
  return decorateParameter(() => injectProvider(Eventbus).getSubject(subId, schema))
}
