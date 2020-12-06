/** @prettier */
import { createErrorClass } from './createErrorClass.ts';

export interface NotFoundError extends Error {}

export interface NotFoundErrorCtor {
  new (message: string): NotFoundError;
}

/**
 * An error thrown when a value or values are missing from an
 * observable sequence.
 *
 * @see {@link operators/single}
 *
 * @class NotFoundError
 */
export const NotFoundError: NotFoundErrorCtor = createErrorClass(
  (_super) =>
    function NotFoundErrorImpl(this: any, message: string) {
      _super(this);
      this.name = 'NotFoundError';
      this.message = message;
    }
);
