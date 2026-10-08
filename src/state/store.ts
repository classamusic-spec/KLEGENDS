import { useCallback, useRef, useSyncExternalStore } from 'react';

/** Minimal observable store shared by React hooks and non-React services. */
export interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
}

export const createStore = <T,>(initial: T): Store<T> => {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(value) : next;
      if (Object.is(resolved, value)) return;
      value = resolved;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

/**
 * Subscribes to a slice of a store. The selector result is cached by
 * reference equality on the store value, so selectors may build new objects.
 */
export const useStore = <T, S>(store: Store<T>, selector: (value: T) => S): S => {
  const cache = useRef<{ source: T; result: S } | null>(null);
  const select = useCallback(() => {
    const source = store.get();
    if (cache.current && Object.is(cache.current.source, source)) return cache.current.result;
    const result = selector(source);
    cache.current = { source, result };
    return result;
    // The selector is expected to be stable in intent; callers pass inline lambdas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);
  return useSyncExternalStore(store.subscribe, select, select);
};
