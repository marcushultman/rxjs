/** @prettier */
import { Observable } from '../Observable';
import { Subscriber } from '../Subscriber';
import { Subscription } from '../Subscription';

import { MonoTypeOperatorFunction, SubscribableOrPromise } from '../types';
import { lift } from '../util/lift';
import { OperatorSubscriber } from './OperatorSubscriber';
import { from } from '../observable/from';

export interface ThrottleConfig {
  leading?: boolean;
  trailing?: boolean;
}

export const defaultThrottleConfig: ThrottleConfig = {
  leading: true,
  trailing: false,
};

/**
 * Emits a value from the source Observable, then ignores subsequent source
 * values for a duration determined by another Observable, then repeats this
 * process.
 *
 * <span class="informal">It's like {@link throttleTime}, but the silencing
 * duration is determined by a second Observable.</span>
 *
 * ![](throttle.png)
 *
 * `throttle` emits the source Observable values on the output Observable
 * when its internal timer is disabled, and ignores source values when the timer
 * is enabled. Initially, the timer is disabled. As soon as the first source
 * value arrives, it is forwarded to the output Observable, and then the timer
 * is enabled by calling the `durationSelector` function with the source value,
 * which returns the "duration" Observable. When the duration Observable emits a
 * value or completes, the timer is disabled, and this process repeats for the
 * next source value.
 *
 * ## Example
 * Emit clicks at a rate of at most one click per second
 * ```ts
 * import { fromEvent, interval } from 'rxjs';
 * import { throttle } from 'rxjs/operators';
 *
 * const clicks = fromEvent(document, 'click');
 * const result = clicks.pipe(throttle(ev => interval(1000)));
 * result.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link audit}
 * @see {@link debounce}
 * @see {@link delayWhen}
 * @see {@link sample}
 * @see {@link throttleTime}
 *
 * @param {function(value: T): SubscribableOrPromise} durationSelector A function
 * that receives a value from the source Observable, for computing the silencing
 * duration for each source value, returned as an Observable or a Promise.
 * @param {Object} config a configuration object to define `leading` and `trailing` behavior. Defaults
 * to `{ leading: true, trailing: false }`.
 * @return {Observable<T>} An Observable that performs the throttle operation to
 * limit the rate of emissions from the source.
 * @name throttle
 */
export function throttle<T>(
  durationSelector: (value: T) => SubscribableOrPromise<any>,
  { leading, trailing }: ThrottleConfig = defaultThrottleConfig
): MonoTypeOperatorFunction<T> {
  return (source: Observable<T>) =>
    lift(source, function (this: Subscriber<T>, source: Observable<T>) {
      const subscriber = this;
      let hasValue = false;
      let sendValue: T | null = null;
      let throttled: Subscription | null = null;

      const throttlingDone = () => {
        throttled?.unsubscribe();
        throttled = null;
        trailing && send();
      };

      const throttle = (value: T) =>
        (throttled = from(durationSelector(value)).subscribe(
          new OperatorSubscriber(subscriber, throttlingDone, undefined, throttlingDone)
        ));

      const send = () => {
        if (hasValue) {
          subscriber.next(sendValue!);
          throttle(sendValue!);
        }
        hasValue = false;
        sendValue = null;
      };

      source.subscribe(
        new OperatorSubscriber(subscriber, (value) => {
          hasValue = true;
          sendValue = value;
          !throttled && (leading ? send() : throttle(value));
        })
      );
    });
}
