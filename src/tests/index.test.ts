import { act, renderHook } from '@testing-library/react-hooks/native';
import { describe, expect, test } from 'vitest';
import { testmachine } from './fixtures/test.machine';
import { useWorkflow } from './fixtures/useWorkflow';
import reactInterpret from './index';

describe('Acceptation', () => {
  const service = reactInterpret(testmachine);
  const expectFn = (arg: unknown) => expect(arg).toBeInstanceOf(Function);

  test.concurrent('start is function', () => {
    expectFn(service.start);
  });

  test.concurrent('stop is function', () => {
    expectFn(service.stop);
  });

  test.concurrent('sender is function', () => {
    expectFn(service.sender);
  });

  test.concurrent('createSelector is function', () => {
    expectFn(service.createSelector);
  });

  test.concurrent('createContextSelector is function', () => {
    expectFn(service.createContextSelector);
  });

  test.concurrent('useSelector is function', () => {
    expectFn(service.useSelector);
  });

  test.concurrent('useMatches is function', () => {
    expectFn(service.useMatches);
  });

  test.concurrent('useHasTags is function', () => {
    expectFn(service.useHasTags);
  });
});

describe('Workflows', () => {
  describe.concurrent('Workflow - 1', () => {
    const { spyStart, spySend, spySender, useIterator, service } =
      useWorkflow();

    test('Start is called', () => {
      expect(spyStart).toBeCalledTimes(1);
    });

    test('At start, iterator is "0"', () => {
      const { result } = renderHook(useIterator);
      expect(result.current).toBe(0);
    });

    test('State is off', () => {
      const { result } = renderHook(() => service.useMatches('off'));
      expect(result.current).toBe(true);
    });

    test('Send CLICK', () => {
      service.send('CLICK');
    });

    test('Iterator is "1"', () => {
      const { result } = renderHook(useIterator);
      expect(result.current).toBe(1);
    });

    test('State is on', () => {
      const { result } = renderHook(() => service.useMatches('on'));
      expect(result.current).toBe(true);
    });

    test('Sender and CLICK', () => {
      const send = service.sender('CLICK');
      send();
    });

    test('State is off', () => {
      const { result } = renderHook(() => service.useMatches('off'));
      expect(result.current).toBe(true);
    });

    test('Iterator is "2"', () => {
      const { result } = renderHook(useIterator);
      expect(result.current).toBe(2);
    });

    describe('Functions calls', () => {
      test('Send is called once', () => {
        expect(spySend).toBeCalledTimes(1);
      });

      test('Sender is called once', () => {
        expect(spySender).toBeCalledTimes(1);
      });
    });
  });

  describe.concurrent('Workflow - 2', () => {
    const { service } = useWorkflow();

    test('send ClICK', () => {
      service.send('CLICK');
    });

    test('The value of State is "on"', () => {
      const selector = service.createSelector(({ value }) => value);
      const { result } = renderHook(() => service.useSelector(selector));
      expect(result.current).toBe('on');
    });

    test('send ClICK', () => {
      service.send('CLICK');
    });

    test('The value of State is "off"', () => {
      const selector = service.createSelector();
      const { result } = renderHook(() => service.useSelector(selector));
      expect(result.current.value).toBe('off');
    });

    test('Iterator is "2"', () => {
      const selector = service.createContextSelector();
      const { result } = renderHook(() => service.useSelector(selector));
      expect(result.current.testIterator).toBe(2);
    });

    test('The current state has tag "busy"', () => {
      const { result } = renderHook(() => service.useHasTags('busy'));
      expect(result.current).toBe(true);
    });
  });

  test('Will not change value if compararison is always true', () => {
    const { createSelector, send, useSelector, start } =
      reactInterpret(testmachine);
    const selector = createSelector(({ value }) => value);
    const { result } = renderHook(() => useSelector(selector, () => true));
    act(() => {
      start();
    });
    expect(result.current).toBe('off');
    send('CLICK');
    expect(result.current).toBe('off');
  });
});
