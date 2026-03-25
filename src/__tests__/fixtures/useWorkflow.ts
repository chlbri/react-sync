import { afterAll, beforeAll, vi } from 'vitest';
import reactInterpret from '..';
import { testmachine } from './test.machine';

export const useWorkflow = () => {
  const service = reactInterpret(testmachine);
  const spyStart = vi.spyOn(service, 'start');
  const spySend = vi.spyOn(service, 'send');
  const spySender = vi.spyOn(service, 'sender');
  const spyStop = vi.spyOn(service, 'stop');
  const spyCreateSelector = vi.spyOn(service, 'createSelector');
  const spyCreateContextSelector = vi.spyOn(
    service,
    'createContextSelector',
  );
  const spyUseSelector = vi.spyOn(service, 'useSelector');
  const spyUseMatches = vi.spyOn(service, 'useMatches');
  const spyUseHasTags = vi.spyOn(service, 'useHasTags');
  const iteratorSelector = service.createContextSelector(
    ({ testIterator: iterator }) => iterator,
  );

  const useIterator = () => service.useSelector(iteratorSelector);

  beforeAll(() => {
    service.start();
  });

  afterAll(() => {
    [
      spySend,
      spySender,
      spyCreateSelector,
      spyCreateContextSelector,
      spyUseHasTags,
      spyUseSelector,
      spyUseMatches,
    ].forEach(fn => fn.mockReset());
    service.stop();
  });

  return {
    spyStart,
    spySend,
    spySender,
    spyStop,
    spyCreateSelector,
    spyCreateContextSelector,
    spyUseHasTags,
    spyUseSelector,
    spyUseMatches,
    useIterator,
    service,
  };
};
