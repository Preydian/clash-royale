import { useEffect, useState } from 'react';
import { errorMessage } from './api';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'done'; data: T };

/** Runs `load` whenever `key` changes, ignoring results from stale runs. */
export function useAsync<T>(
  load: () => Promise<T>,
  key: string,
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    load().then(
      (data) => {
        if (!cancelled) setState({ status: 'done', data });
      },
      (err: unknown) => {
        if (!cancelled) setState({ status: 'error', error: errorMessage(err) });
      },
    );
    return () => {
      cancelled = true;
    };
    // `load` is a fresh closure each render; `key` is what identifies the request.
  }, [key]);

  return state;
}
