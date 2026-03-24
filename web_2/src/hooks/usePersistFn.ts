import { useRef } from "react";

type noop = (...args: unknown[]) => unknown;

/**
 * usePersistFn — stable callback ref that always calls the latest version of fn
 */
export function usePersistFn<T extends noop>(fn: T) {
  const fnRef = useRef<T>(fn);
  fnRef.current = fn;

  const persistFn = useRef<T | null>(null);
  if (!persistFn.current) {
    persistFn.current = function (this: unknown, ...args: unknown[]) {
      return fnRef.current!.apply(this, args);
    } as T;
  }

  return persistFn.current!;
}
