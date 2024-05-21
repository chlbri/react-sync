## Add better compatobolity to react state/store libraries

### Example of the xstate selector for react

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useRef } from 'react';
import type {
  AnyState,
  EventObject,
  Interpreter,
  State,
  StateFrom,
  Typestate,
} from 'xstate';
import { useSync } from '../hook';
import { defaultCompare, defaultSelector, getSnapShot } from './utils';

export default function useSelector<
  TContext extends object,
  TEvents extends EventObject = EventObject,
  TTypestate extends Typestate<TContext> = {
    value: any;
    context: TContext;
  },
  T = State<TContext, TEvents, any, TTypestate>,
>(
  service: Interpreter<TContext, any, TEvents, TTypestate, any>,
  selector: (
    emitted: StateFrom<
      Interpreter<TContext, any, TEvents, TTypestate, any>['machine']
    >,
  ) => T = defaultSelector,
  compare: (a: T, b: T) => boolean = defaultCompare,
): T {
  const initialStateCacheRef = useRef<AnyState>();

  type Listener = (
    emitted: StateFrom<
      Interpreter<TContext, any, TEvents, TTypestate, any>['machine']
    >,
  ) => void;

  // #region Hooks
  const subscribe = useCallback(
    (listerner?: Listener) => {
      const { unsubscribe } = service.subscribe(listerner);
      return unsubscribe;
    },
    [service],
  );

  const boundGetSnapshot = useCallback(() => {
    return getSnapShot<TContext, TEvents, TTypestate>(
      service,
      initialStateCacheRef,
    );
  }, [service]);
  // #endregion

  const selectedSnapshot = useSync(
    subscribe,
    boundGetSnapshot,
    boundGetSnapshot,
    selector,
    compare,
  );

  return selectedSnapshot;
}
```
