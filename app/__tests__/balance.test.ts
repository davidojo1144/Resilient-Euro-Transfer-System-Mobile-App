import { selectDisplayBalance } from '../src/store/selectors';

test('display balance equals server minus pending sum', () => {
  const state: any = {
    wallet: { serverBalance: 500 },
    transactions: {
      queue: [
        { id: '1', idempotencyKey: 'k1', amount: 60, recipient: 'bob', status: 'pending', attempts: 0, createdAt: Date.now() },
      ],
      isProcessing: false,
    },
    network: { isConnected: true, isInternetReachable: true, simulationOffline: false },
  };
  expect(selectDisplayBalance(state)).toBe(440);
});