import AsyncStorage from '@react-native-async-storage/async-storage';

export type PostTransactionInput = {
  amount: number;
  recipient: string;
  idempotencyKey: string;
};

export class NoConnectionError extends Error {
  constructor(message = 'No Connection') {
    super(message);
    this.name = 'NoConnectionError';
  }
}

export class ServerError extends Error {
  constructor(message = 'Server Error') {
    super(message);
    this.name = 'ServerError';
  }
}

export class InsufficientFundsError extends Error {
  constructor(message = 'Insufficient Funds') {
    super(message);
    this.name = 'InsufficientFundsError';
  }
}

const STORAGE_KEYS = {
  serverBalance: 'mock_server_balance',
  processedIds: 'mock_processed_ids',
  networkBlocked: 'mock_network_blocked',
};

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function getProcessedIds(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.processedIds);
  const arr = raw ? JSON.parse(raw) as string[] : [];
  return new Set(arr);
}

async function addProcessedId(id: string): Promise<void> {
  const set = await getProcessedIds();
  set.add(id);
  await AsyncStorage.setItem(STORAGE_KEYS.processedIds, JSON.stringify(Array.from(set)));
}

async function isNetworkBlocked(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.networkBlocked);
  return raw === 'true';
}

export async function setNetworkBlocked(blocked: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.networkBlocked, blocked ? 'true' : 'false');
}

export async function getBalance(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.serverBalance);
  if (raw == null) {
    await AsyncStorage.setItem(STORAGE_KEYS.serverBalance, JSON.stringify(500));
    return 500;
  }
  return JSON.parse(raw);
}

export async function postTransaction(input: PostTransactionInput): Promise<{ success: true }>{
  // Simulate latency 300–1200ms
  const latency = 300 + Math.floor(Math.random() * 900);
  await delay(latency);

  // Simulate network blocked regardless of actual connectivity
  if (await isNetworkBlocked()) {
    throw new NoConnectionError();
  }

  // Idempotency: if already processed, return success without double-charge
  const processed = await getProcessedIds();
  if (processed.has(input.idempotencyKey)) {
    return { success: true };
  }

  // Random server 500 ~15% chance
  const roll = Math.random();
  if (roll < 0.15) {
    throw new ServerError();
  }

  // Fetch server balance and enforce insufficient funds
  const current = await getBalance();
  if (current < input.amount) {
    throw new InsufficientFundsError();
  }

  // Success: deduct and record idempotency key
  const next = current - input.amount;
  await AsyncStorage.setItem(STORAGE_KEYS.serverBalance, JSON.stringify(next));
  await addProcessedId(input.idempotencyKey);
  return { success: true };
}