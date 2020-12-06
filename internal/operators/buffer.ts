/** @prettier */
import { Observable } from '../Observable.ts';
import { OperatorFunction } from '../types.ts';
import { operate } from '../util/lift.ts';
import { OperatorSubscriber } from './OperatorSubscriber.ts';

/**
 * Buffers the source Observable values until `closingNotifier` emits.
 *
 * <span class="informal">Collects values from the past as an array, and emits
 * that array only when another Observable emits.</span>
 *
 * ![](buffer.png)
 *
 * Buffers the incoming Observable values until the given `closingNotifier`
 * Observable emits a value, at which point it emits the buffer on the output
 * Observable and starts a new buffer internally, awaiting the next time
 * `closingNotifier` emits.
 *
 * ## Example
 *
 * On every click, emit array of most recent interval events
 *
 * ```ts
 * import { fromEvent, interval } from 'rxjs';
 * import { buffer } from 'rxjs/operators';
 *
 * const clicks = fromEvent(document, 'click');
 * const intervalEvents = interval(1000);
 * const buffered = intervalEvents.pipe(buffer(clicks));
 * buffered.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link bufferCount}
 * @see {@link bufferTime}
 * @see {@link bufferToggle}
 * @see {@link bufferWhen}
 * @see {@link window}
 *
 * @param {Observable<any>} closingNotifier An Observable that signals the
 * buffer to be emitted on the output Observable.
 * @return {Observable<T[]>} An Observable of buffers, which are arrays of
 * values.
 */
export function buffer<T>(closingNotifier: Observable<any>): OperatorFunction<T, T[]> {
  return operate((source, subscriber) => {
    let currentBuffer: T[] = [];

    // Subscribe to our source.
    source.subscribe(new OperatorSubscriber(subscriber, (value) => currentBuffer.push(value)));

    // Subscribe to the closing notifier.
    closingNotifier.subscribe(
      new OperatorSubscriber(subscriber, () => {
        // Start a new buffer and emit the previous one.
        const b = currentBuffer;
        currentBuffer = [];
        subscriber.next(b);
      })
    );

    return () => {
      // Ensure buffered values are released on teardown.
      currentBuffer = null!;
    };
  });
}
