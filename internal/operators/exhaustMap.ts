/** @prettier */
import { Observable } from '../Observable.ts';
import { Subscriber } from '../Subscriber.ts';
import { ObservableInput, OperatorFunction, ObservedValueOf } from '../types.ts';
import { map } from './map.ts';
import { innerFrom } from '../observable/from.ts';
import { operate } from '../util/lift.ts';
import { OperatorSubscriber } from './OperatorSubscriber.ts';

/* tslint:disable:max-line-length */
export function exhaustMap<T, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O
): OperatorFunction<T, ObservedValueOf<O>>;
/** @deprecated resultSelector is no longer supported. Use inner map instead. */
export function exhaustMap<T, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O,
  resultSelector: undefined
): OperatorFunction<T, ObservedValueOf<O>>;
/** @deprecated resultSelector is no longer supported. Use inner map instead. */
export function exhaustMap<T, I, R>(
  project: (value: T, index: number) => ObservableInput<I>,
  resultSelector: (outerValue: T, innerValue: I, outerIndex: number, innerIndex: number) => R
): OperatorFunction<T, R>;
/* tslint:enable:max-line-length */

/**
 * Projects each source value to an Observable which is merged in the output
 * Observable only if the previous projected Observable has completed.
 *
 * <span class="informal">Maps each value to an Observable, then flattens all of
 * these inner Observables using {@link exhaust}.</span>
 *
 * ![](exhaustMap.png)
 *
 * Returns an Observable that emits items based on applying a function that you
 * supply to each item emitted by the source Observable, where that function
 * returns an (so-called "inner") Observable. When it projects a source value to
 * an Observable, the output Observable begins emitting the items emitted by
 * that projected Observable. However, `exhaustMap` ignores every new projected
 * Observable if the previous projected Observable has not yet completed. Once
 * that one completes, it will accept and flatten the next projected Observable
 * and repeat this process.
 *
 * ## Example
 * Run a finite timer for each click, only if there is no currently active timer
 * ```ts
 * import { fromEvent, interval } from 'rxjs';
 * import { exhaustMap, take } from 'rxjs/operators';
 *
 * const clicks = fromEvent(document, 'click');
 * const result = clicks.pipe(
 *   exhaustMap(ev => interval(1000).pipe(take(5)))
 * );
 * result.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link concatMap}
 * @see {@link exhaust}
 * @see {@link mergeMap}
 * @see {@link switchMap}
 *
 * @param {function(value: T, ?index: number): ObservableInput} project A function
 * that, when applied to an item emitted by the source Observable, returns an
 * Observable.
 * @return {Observable} An Observable containing projected Observables
 * of each item of the source, ignoring projected Observables that start before
 * their preceding Observable has completed.
 */
export function exhaustMap<T, R, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O,
  resultSelector?: (outerValue: T, innerValue: ObservedValueOf<O>, outerIndex: number, innerIndex: number) => R
): OperatorFunction<T, ObservedValueOf<O> | R> {
  if (resultSelector) {
    // DEPRECATED PATH
    return (source: Observable<T>) =>
      source.pipe(exhaustMap((a, i) => innerFrom(project(a, i)).pipe(map((b: any, ii: any) => resultSelector(a, b, i, ii)))));
  }
  return operate((source, subscriber) => {
    let index = 0;
    let innerSub: Subscriber<T> | null = null;
    let isComplete = false;
    source.subscribe(
      new OperatorSubscriber(
        subscriber,
        (outerValue) => {
          if (!innerSub) {
            innerSub = new OperatorSubscriber(subscriber, undefined, undefined, () => {
              innerSub = null;
              isComplete && subscriber.complete();
            });
            innerFrom(project(outerValue, index++)).subscribe(innerSub);
          }
        },
        undefined,
        () => {
          isComplete = true;
          !innerSub && subscriber.complete();
        }
      )
    );
  });
}
