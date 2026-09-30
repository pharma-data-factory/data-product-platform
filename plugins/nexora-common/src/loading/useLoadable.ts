import { useCallback, useEffect, useState } from 'react';

/**
 * The state of one asynchronous load, with a way to try again.
 *
 * Wave 4 of the maturity remediation (NXD-094). Six pages caught a failed
 * load with `.catch(() => setLoading(false))` or `.catch(() => {})`, so a 401
 * or a 500 rendered as "nothing here" — an empty catalog, a missing approval
 * status. `error` is the difference between "there is nothing" and "we could
 * not find out", and a page that has one must say so.
 */
export interface Loadable<T> {
  value?: T;
  loading: boolean;
  error?: Error;
  /** Runs the load again. Clears the error and shows loading meanwhile. */
  retry: () => void;
}

/**
 * Runs `load` on mount, whenever `load` changes identity, and on `retry()`.
 *
 * `load` must be stable — wrap it in `useCallback` with the inputs it reads.
 * Taking the function rather than a dependency list keeps the hook inside
 * what `react-hooks/exhaustive-deps` can check at the call site.
 *
 * A result that arrives after unmount, or after a newer load started, is
 * dropped rather than written over fresher state.
 */
export function useLoadable<T>(load: () => Promise<T>): Loadable<T> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<Loadable<T>, 'retry'>>({
    loading: true,
  });

  useEffect(() => {
    let current = true;
    setState(previous => ({ value: previous.value, loading: true }));
    load().then(
      value => {
        if (current) {
          setState({ value, loading: false });
        }
      },
      (error: unknown) => {
        if (current) {
          setState({
            loading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },
    );
    return () => {
      current = false;
    };
  }, [load, attempt]);

  const retry = useCallback(() => setAttempt(n => n + 1), []);

  return { ...state, retry };
}
