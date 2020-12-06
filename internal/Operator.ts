import { Subscriber } from './Subscriber.ts';
import { TeardownLogic } from './types.ts';

/***
 * @deprecated Internal implementation detail, do not use.
 */
export interface Operator<T, R> {
  call(subscriber: Subscriber<R>, source: any): TeardownLogic;
}
