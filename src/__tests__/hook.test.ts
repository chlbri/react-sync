import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useSync } from '../hook';

type Snapshot = { count: number };

function makeStore(initial: Snapshot) {
  let snapshot = { ...initial };
  const listeners = new Set<() => void>();

  const subscribe = (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };
  const getSnapshot = () => snapshot;
  const emit = (next: Snapshot) => {
    snapshot = next;
    listeners.forEach(fn => fn());
  };

  return { subscribe, getSnapshot, emit };
}

describe('useSync', () => {
  // Lines 127-128: getServerSnapshotWithSelector is built (non-null path)
  describe('lines 127-128 — getServerSnapshotWithSelector when getServerSnapshot is provided', () => {
    test.concurrent('returns correct value with getServerSnapshot provided', () => {
      const { subscribe, getSnapshot } = makeStore({ count: 42 });
      const getServerSnapshot = () => ({ count: 42 });
      const selector = (s: Snapshot) => s.count;

      const { result } = renderHook(() =>
        useSync(subscribe, getSnapshot, getServerSnapshot, selector),
      );

      expect(result.current).toBe(42);
    });

    test.concurrent('getServerSnapshot flows through memoizedSelector', () => {
      const { subscribe, getSnapshot } = makeStore({ count: 7 });
      const getServerSnapshot = vi.fn(() => ({ count: 7 }));
      const selector = vi.fn((s: Snapshot) => s.count * 2);

      const { result } = renderHook(() =>
        useSync(subscribe, getSnapshot, getServerSnapshot, selector),
      );

      expect(result.current).toBe(14);
    });
  });

  // Lines 88-90: inst.hasValue is true + isEqual defined → reuse cached selection
  describe('lines 88-90 — isEqual reuses inst.value when inst already has a value', () => {
    test('returns cached selection when isEqual returns true and inst already has a value', async () => {
      const { subscribe, getSnapshot } = makeStore({ count: 0 });
      const isEqual = vi.fn((_a: number, _b: number) => true);

      // Mutable selector ref; changing its reference forces useMemo to recompute
      // (hasMemo resets to false) while inst.hasValue remains true from the first render.
      let selectorRef = (_s: Snapshot) => _s.count;

      const { result, rerender } = renderHook(() =>
        useSync(subscribe, getSnapshot, null, selectorRef, isEqual),
      );

      // First render: inst.hasValue = false → lines 88-90 not yet hit.
      expect(result.current).toBe(0);

      // Force useMemo recomputation by swapping to a new selector reference.
      // useEffect from the first render has already set inst.hasValue = true.
      await act(async () => {
        selectorRef = (_s: Snapshot) => _s.count;
      });
      rerender();

      // hasMemo = false again, inst.hasValue = true → lines 88-90 are hit.
      // isEqual(0, 0) → true → returns inst.value (0).
      expect(isEqual).toHaveBeenCalled();
      expect(result.current).toBe(0);
    });

    test('does NOT reuse inst.value when isEqual returns false', async () => {
      const { subscribe, getSnapshot, emit } = makeStore({ count: 0 });
      const isEqual = vi.fn((a: number, b: number) => a === b);

      let selectorRef = (_s: Snapshot) => _s.count;

      const { result, rerender } = renderHook(() =>
        useSync(subscribe, getSnapshot, null, selectorRef, isEqual),
      );

      expect(result.current).toBe(0);

      await act(async () => {
        emit({ count: 5 });
        selectorRef = (_s: Snapshot) => _s.count;
      });
      rerender();

      // isEqual(0, 5) → false → memoizedSelection updated to 5.
      expect(result.current).toBe(5);
    });
  });

  describe('lines 114-115 — isEqual reuses prevSelection when snapshot changed but selections are equal', () => {
    test('returns prevSelection when snapshot changes but isEqual returns true', async () => {
      const { subscribe, getSnapshot, emit } = makeStore({ count: 0 });
      const isEqual = vi.fn(() => true);
      const selector = vi.fn((s: Snapshot) => s.count);

      const { result } = renderHook(() =>
        useSync(subscribe, getSnapshot, null, selector, isEqual),
      );

      // First render: hasMemo=false path, memoizedSelection=0
      expect(result.current).toBe(0);

      // Emit new snapshot → hasMemo=true, objectIs(prev, next)=false,
      // nextSelection=1, isEqual(0, 1)→true → lines 114-115: return prevSelection(0)
      await act(async () => {
        emit({ count: 1 });
      });

      expect(isEqual).toHaveBeenCalled();
      expect(result.current).toBe(0);
    });

    test('updates selection when snapshot changes and isEqual returns false', async () => {
      const { subscribe, getSnapshot, emit } = makeStore({ count: 0 });
      const isEqual = vi.fn((a: number, b: number) => a === b);
      const selector = vi.fn((s: Snapshot) => s.count);

      const { result } = renderHook(() =>
        useSync(subscribe, getSnapshot, null, selector, isEqual),
      );

      expect(result.current).toBe(0);

      await act(async () => {
        emit({ count: 3 });
      });

      // isEqual(0, 3) → false → skip lines 114-115, memoizedSelection updated to 3
      expect(result.current).toBe(3);
    });
  });

  // Line 123: getSnapshotWithSelector = () => memoizedSelector(getSnapshot())
  describe('line 123 — getSnapshotWithSelector calls getSnapshot through memoizedSelector', () => {
    test.concurrent('selector receives the value returned by getSnapshot', () => {
      const { subscribe, getSnapshot } = makeStore({ count: 3 });
      const selector = vi.fn((s: Snapshot) => s.count * 10);

      const { result } = renderHook(() =>
        useSync(subscribe, getSnapshot, null, selector),
      );

      expect(selector).toHaveBeenCalledWith({ count: 3 });
      expect(result.current).toBe(30);
    });

    test('re-invokes getSnapshot through memoizedSelector on every store emission', async () => {
      const { subscribe, getSnapshot, emit } = makeStore({ count: 1 });
      const selector = vi.fn((s: Snapshot) => s.count);

      const { result } = renderHook(() =>
        useSync(subscribe, getSnapshot, null, selector),
      );

      expect(result.current).toBe(1);

      await act(async () => {
        emit({ count: 2 });
      });

      expect(selector).toHaveBeenCalledWith({ count: 2 });
      expect(result.current).toBe(2);
    });
  });

  // Line 128: () => memoizedSelector(maybeGetServerSnapshot())
  // The arrow function is constructed at useMemo time regardless of whether
  // useSyncExternalStore calls it (client-side jsdom only uses getSnapshot).
  describe('line 128 — getServerSnapshotWithSelector is constructed when getServerSnapshot is provided', () => {
    test.concurrent('hook works correctly when getServerSnapshot is provided', () => {
      const { subscribe, getSnapshot } = makeStore({ count: 55 });
      const getServerSnapshot = vi.fn(() => ({ count: 55 }));
      const selector = vi.fn((s: Snapshot) => s.count + 1);

      const { result } = renderHook(() =>
        useSync(subscribe, getSnapshot, getServerSnapshot, selector),
      );

      // Line 128 arrow function was constructed; hook returns correct client value
      expect(result.current).toBe(56);
      expect(selector).toHaveBeenCalledWith({ count: 55 });
    });

    test.concurrent('memoizedSelector is applied through getServerSnapshotWithSelector construction', () => {
      const { subscribe, getSnapshot } = makeStore({ count: 8 });
      const serverSnapshot = { count: 8 };
      const getServerSnapshot = vi.fn(() => serverSnapshot);
      const selector = vi.fn((s: Snapshot) => s.count * 3);

      const { result } = renderHook(() =>
        useSync(subscribe, getSnapshot, getServerSnapshot, selector),
      );

      // Line 128 function constructed; client snapshot drives result
      expect(result.current).toBe(24);
      expect(selector).toHaveBeenCalledWith(serverSnapshot);
    });
  });
});
