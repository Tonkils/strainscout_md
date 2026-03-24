/* eslint-disable react-hooks/refs */
// usePersistFn uses the stable-ref pattern which accesses .current during render by design.
// The React Compiler lint rule is disabled here intentionally.
import { useRef } from "react";

type noop = (...args: unknown[]) => unknown;

/**
 * usePersistFn — stable callback ref that always calls the latest version of fn
 */
export function usePersistFn<T extends noop>(fn: T) {
  const fnRef = useRef<T>(fn);
  fnRef.current = fn;

  const persistFn = useRef<T | null>(null);
  if (persistFn.current == null) {
    persistFn.current = ((...args: unknown[]) => fnRef.current!(...args)) as T;
  }

  return persistFn.current!;
}
