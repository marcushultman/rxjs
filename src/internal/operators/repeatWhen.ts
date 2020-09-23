/** @prettier */
import { Subscriber } from '../Subscriber';
import { Observable } from '../Observable';
import { Subject } from '../Subject';
import { Subscription } from '../Subscription';

import { MonoTypeOperatorFunction } from '../types';
import { lift } from '../util/lift';
import { OperatorSubscriber } from './OperatorSubscriber';

/**
 * Returns an Observable that mirrors the source Observable with the exception of a `complete`. If the source
 * Observable calls `complete`, this method will emit to the Observable returned from `notifier`. If that Observable
 * calls `complete` or `error`, then this method will call `complete` or `error` on the child subscription. Otherwise
 * this method will resubscribe to the source Observable.
 *
 * ![](repeatWhen.png)
 *
 * ## Example
 * Repeat a message stream on click
 * ```ts
 * import { of, fromEvent } from 'rxjs';
 * import { repeatWhen } from 'rxjs/operators';
 *
 * const source = of('Repeat message');
 * const documentClick$ = fromEvent(document, 'click');
 *
 * source.pipe(repeatWhen(() => documentClick$)
 * ).subscribe(data => console.log(data))
 * ```
 * @see {@link repeat}
 * @see {@link retry}
 * @see {@link retryWhen}
 *
 * @param {function(notifications: Observable): Observable} notifier - Receives an Observable of notifications with
 * which a user can `complete` or `error`, aborting the repetition.
 * @return {Observable} The source Observable modified with repeat logic.
 * @name repeatWhen
 */
export function repeatWhen<T>(notifier: (notifications: Observable<void>) => Observable<any>): MonoTypeOperatorFunction<T> {
  return (source: Observable<T>) =>
    lift(source, function (this: Subscriber<T>, source: Observable<T>) {
      const subscriber = this;
      let innerSub: Subscription | null;
      let syncResub = false;
      let completions$: Subject<void>;
      let isNotifierComplete = false;
      let isMainComplete = false;

      /**
       * Checks to see if we can complete the result, completes it, and returns `true` if it was completed.
       */
      const checkComplete = () => isMainComplete && isNotifierComplete && (subscriber.complete(), true);
      /**
       * Gets the subject to send errors through. If it doesn't exist,
       * we know we need to setup the notifier.
       */
      const getCompletionSubject = () => {
        if (!completions$) {
          completions$ = new Subject();

          // If the call to `notifier` throws, it will be caught by the OperatorSubscriber
          // In the main subscription -- in `subscribeForRepeatWhen`.
          notifier(completions$).subscribe(
            new OperatorSubscriber(
              subscriber,
              () => {
                if (innerSub) {
                  subscribeForRepeatWhen();
                } else {
                  // If we don't have an innerSub yet, that's because the inner subscription
                  // call hasn't even returned yet. We've arrived here synchronously.
                  // So we flag that we want to resub, such that we can ensure teardown
                  // happens before we resubscribe.
                  syncResub = true;
                }
              },
              undefined,
              () => {
                isNotifierComplete = true;
                checkComplete();
              }
            )
          );
        }
        return completions$;
      };

      const subscribeForRepeatWhen = () => {
        isMainComplete = false;

        innerSub = source.subscribe(
          new OperatorSubscriber(subscriber, undefined, undefined, () => {
            isMainComplete = true;
            // Check to see if we are complete, and complete if so.
            // If we are not complete. Get the subject. This calls the `notifier` function.
            // If that function fails, it will throw and `.next()` will not be reached on this
            // line. The thrown error is caught by the _complete handler in this
            // `OperatorSubscriber` and handled appropriately.
            !checkComplete() && getCompletionSubject().next();
          })
        );

        if (syncResub) {
          // Ensure that the inner subscription is torn down before
          // moving on to the next subscription in the synchronous case.
          // If we don't do this here, all inner subscriptions will not be
          // torn down until the entire observable is done.
          innerSub.unsubscribe();
          // It is important to null this out. Not only to free up memory, but
          // to make sure code above knows we are in a subscribing state to
          // handle synchronous resubscription.
          innerSub = null;
          // We may need to do this multiple times, so reset the flags.
          syncResub = false;
          // Resubscribe
          subscribeForRepeatWhen();
        }
      };

      // Start the subscription
      subscribeForRepeatWhen();
    });
}
