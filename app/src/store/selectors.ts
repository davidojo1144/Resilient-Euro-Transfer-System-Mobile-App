import { RootState } from './store';

export const selectPendingSum = (state: RootState) =>
  state.transactions.queue
    .filter((t) => t.status === 'pending')
    .reduce((acc, t) => acc + t.amount, 0);

export const selectDisplayBalance = (state: RootState) =>
  Math.max(0, state.wallet.serverBalance - selectPendingSum(state));

export const selectQueue = (state: RootState) => state.transactions.queue;

export const selectNetworkAvailable = (state: RootState) =>
  state.network.isConnected && state.network.isInternetReachable && !state.network.simulationOffline;