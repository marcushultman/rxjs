/** @prettier */
import { SchedulerLike } from '../types.ts';
import { scheduleArray } from '../scheduled/scheduleArray.ts';
import { fromArrayLike } from './from.ts';

export function internalFromArray<T>(input: ArrayLike<T>, scheduler?: SchedulerLike) {
  return scheduler ? scheduleArray(input, scheduler) : fromArrayLike(input);
}
