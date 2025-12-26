import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type TxStatus = 'pending' | 'completed' | 'failed';

export type Transaction = {
  id: string;
  idempotencyKey: string;
  amount: number;
  recipient: string;
  status: TxStatus;
  attempts: number;
  createdAt: number;
};

export type TransactionsState = {
  queue: Transaction[];
  isProcessing: boolean;
};

const initialState: TransactionsState = {
  queue: [],
  isProcessing: false,
};

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    enqueue(state, action: PayloadAction<Transaction>) {
      state.queue.push(action.payload);
    },
    markCompleted(state, action: PayloadAction<{ id: string }>) {
      const tx = state.queue.find((t) => t.id === action.payload.id);
      if (tx) tx.status = 'completed';
    },
    markFailed(state, action: PayloadAction<{ id: string }>) {
      const tx = state.queue.find((t) => t.id === action.payload.id);
      if (tx) tx.status = 'failed';
    },
    incrementAttempts(state, action: PayloadAction<{ id: string }>) {
      const tx = state.queue.find((t) => t.id === action.payload.id);
      if (tx) tx.attempts += 1;
    },
    setProcessing(state, action: PayloadAction<boolean>) {
      state.isProcessing = action.payload;
    },
  },
});

export const {
  enqueue,
  markCompleted,
  markFailed,
  incrementAttempts,
  setProcessing,
} = transactionsSlice.actions;

export default transactionsSlice.reducer;