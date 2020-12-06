import { Observable } from '../Observable.ts';
import { Subscription } from '../Subscription.ts';
import { observable as Symbol_observable } from '../symbol/observable.ts';
import { InteropObservable, SchedulerLike, Subscribable } from '../types.ts';

export function scheduleObservable<T>(input: InteropObservable<T>, scheduler: SchedulerLike) {
  return new Observable<T>(subscriber => {
    const sub = new Subscription();
    sub.add(scheduler.schedule(() => {
      const observable: Subscribable<T> = (input as any)[Symbol_observable]();
      sub.add(observable.subscribe({
        next(value) { sub.add(scheduler.schedule(() => subscriber.next(value))); },
        error(err) { sub.add(scheduler.schedule(() => subscriber.error(err))); },
        complete() { sub.add(scheduler.schedule(() => subscriber.complete())); },
      }));
    }));
    return sub;
  });
}
