import { store } from '../src/store/store';
import { enqueue } from '../src/store/transactionsSlice';
import { processQueue } from '../src/domain/processor';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_KEY = 'mock_server_balance';

beforeEach(async () => {
  await AsyncStorage.setItem(SERVER_KEY, JSON.stringify(100));
});

test('server rejection (402) rolls back pending to failed and restores display', async () => {
  // Avoid random 500s
  const origRandom = Math.random;
  // @ts-ignore
  Math.random = () => 0.99;

  const tx = {
    id: 't-rollback',
    idempotencyKey: 'key-rollback',
    amount: 150, // more than server balance
    recipient: 'carol',
    status: 'pending' as const,
    attempts: 0,
    createdAt: Date.now(),
  };
  store.dispatch(enqueue(tx));

  await processQueue(() => store.getState(), store.dispatch);

  const status = store.getState().transactions.queue.find((t) => t.id === 't-rollback')!.status;
  expect(status).toBe('failed');

  const displayBalance = store.getState().wallet.serverBalance
    - store.getState().transactions.queue.filter((t) => t.status === 'pending').reduce((acc, t) => acc + t.amount, 0);
  // server balance remains 100, no pending left for this tx
  expect(displayBalance).toBe(100);

  // restore random
  Math.random = origRandom;
});