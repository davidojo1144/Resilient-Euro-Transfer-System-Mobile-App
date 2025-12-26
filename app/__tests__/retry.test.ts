import { store } from '../src/store/store';
import { enqueue } from '../src/store/transactionsSlice';
import { setNetworkBlocked } from '../src/data/mockApi';
import { processQueue } from '../src/domain/processor';

jest.setTimeout(20000);

test('increments attempts on network errors and does not complete', async () => {
  // Force no connection
  await setNetworkBlocked(true);

  const tx = {
    id: 't-retry',
    idempotencyKey: 'key-retry',
    amount: 10,
    recipient: 'bob',
    status: 'pending' as const,
    attempts: 0,
    createdAt: Date.now(),
  };
  store.dispatch(enqueue(tx));

  const startAttempts = store.getState().transactions.queue.find((t) => t.id === 't-retry')!.attempts;
  await processQueue(() => store.getState(), store.dispatch);
  const afterAttempts = store.getState().transactions.queue.find((t) => t.id === 't-retry')!.attempts;

  expect(afterAttempts).toBeGreaterThanOrEqual(startAttempts + 1);
  const status = store.getState().transactions.queue.find((t) => t.id === 't-retry')!.status;
  expect(status).toBe('pending');

  // restore connection for other tests
  await setNetworkBlocked(false);
});