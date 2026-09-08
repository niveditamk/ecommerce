/* =============================================================
   AURELIS - ASYNC HOOK
   Minimal data-fetching helper: runs an async function when its
   dependencies change and cancels stale results.
   ============================================================= */
import { useEffect, useState, useCallback, useRef } from 'react';

export function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [state, setState] = useState({ data: null, loading: immediate, error: null });
  const seq = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const execute = useCallback(async () => {
    const ticket = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (ticket !== seq.current) return null;
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      if (ticket !== seq.current) return null;
      if (err.name === 'AbortError') return null;
      setState({ data: null, loading: false, error: err.message || 'Request failed' });
      return null;
    }
  }, []);

  useEffect(() => {
    if (!immediate) return undefined;
    execute();
    return () => { seq.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload: execute };
}

export default useAsync;
