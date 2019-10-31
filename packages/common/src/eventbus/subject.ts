import { InteropObservable, Observable, Subject } from 'rxjs'

import { BsonValue } from 'nnms'
import Container from 'typedi'
import { Eventbus } from './eventbus'

export interface BusSubject<T extends BsonValue = BsonValue> extends InteropObservable<T> {
  next: (value: T) => void
  pipe: Observable<T>['pipe']
  subscribe: Observable<T>['subscribe']
  complete: () => void
}

export function BusSubject<T extends BsonValue>(target: Function): ParameterDecorator {
  return (target, _, index): void => {
    Container.registerHandler({object: target, index, value: () => {
      if (!Container.has(Eventbus)) throw new Error('missing eventbus provider')
      return Container.get(Eventbus).
    }})
  }
}
