import { AppDispatch } from '../store/store';
import { enqueue, incrementAttempts, markCompleted, markFailed, setProcessing } from '../store/transactionsSlice';
import { applyServerDeduction } from '../store/walletSlice';
import { selectNetworkAvailable } from '../store/selectors';
import { PostTransactionInput, NoConnectionError, ServerError, InsufficientFundsError, postTransaction } from '../data/mockApi';
import { v4 as uuidv4 } from 'uuid';

const MAX_RETRIES = 5;

export function createTransaction(amount: number, recipient: string) {
  return {
    id: uuidv4(),
    idempotencyKey: uuidv4(),
    amount,
    recipient,
    status: 'pending' as const,
    attempts: 0,
    createdAt: Date.now(),
  };
}

function backoffMs(attempts: number) {
  const base = 500; // ms
  const factor = 2 ** Math.max(0, attempts - 1);
  return Math.min(8000, base * factor);
}

export async function processQueue(getState: () => any, dispatch: AppDispatch) {
  const state = getState();
  const available = selectNetworkAvailable(state);
  if (!available) return;

  // Prevent parallel processors
  dispatch(setProcessing(true));
  try {
    while (true) {
      const s = getState();
      const next = s.transactions.queue.find((t: any) => t.status === 'pending');
      if (!next) break;

      if (next.attempts >= MAX_RETRIES) {
        dispatch(markFailed({ id: next.id }));
        continue;
      }

      try {
        const payload: PostTransactionInput = {
          amount: next.amount,
          recipient: next.recipient,
          idempotencyKey: next.idempotencyKey,
        };
        await postTransaction(payload);
        // Success: mark completed and apply server deduction
        dispatch(markCompleted({ id: next.id }));
        dispatch(applyServerDeduction(next.amount));
      } catch (e: any) {
        if (e instanceof NoConnectionError || e instanceof ServerError) {
          dispatch(incrementAttempts({ id: next.id }));
          const wait = backoffMs(next.attempts + 1);
          await new Promise((res) => setTimeout(res, wait));
        } else if (e instanceof InsufficientFundsError) {
          // Non-retryable: fail and rollback by removing from pending (mark failed)
          dispatch(markFailed({ id: next.id }));
        } else {
          // Unknown error: treat as server error with retry
          dispatch(incrementAttempts({ id: next.id }));
          const wait = backoffMs(next.attempts + 1);
          await new Promise((res) => setTimeout(res, wait));
        }
      }
    }
  } finally {
    dispatch(setProcessing(false));
  }
}

export function enqueueAndProcess(amount: number, recipient: string) {
  return async (dispatch: AppDispatch, getState: () => any) => {
    const tx = createTransaction(amount, recipient);
    dispatch(enqueue(tx));
    await processQueue(getState, dispatch);
  };
}