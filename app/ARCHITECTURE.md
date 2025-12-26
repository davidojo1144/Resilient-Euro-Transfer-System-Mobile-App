# Architecture

## Stack Choices

- State: Redux Toolkit for predictable reducers and testable business logic
- Persistence: `redux-persist` with `AsyncStorage` for durable queue across restarts
- Connectivity: `@react-native-community/netinfo` to detect reachability; plus a UI simulation toggle
- Local DB: `AsyncStorage` is sufficient for this assignment; a DB (e.g., SQLite/Drift) could be used in production for audit trails
- Testing: `jest-expo` + `@testing-library/react-native`

## Resilience Strategy

- Optimistic UI: enqueue transaction and immediately reflect deduction via selector
- Durable FIFO: queue persisted; processing is single-threaded and strictly oldest-first
- Retry & Backoff: exponential backoff for retryable errors (network, 500)
- Connectivity Triggers: on app launch and when network becomes reachable, attempt processing

## Consistency Strategy

`DisplayBalance = ServerBalance − Sum(PendingTransactions)`

- ServerBalance is updated only when the server confirms success
- Pending sum includes only transactions with `status: 'pending'`
- Rollback: non-retryable errors (`402`) mark the transaction `failed` and remove it from pending sum, restoring display balance

## Defensive Logic

- Anti-fraud guard prevents enqueue if `amount > DisplayBalance`
- FIFO ordering guarantees that later requests cannot bypass earlier failures
- Idempotency via `UUID v4` ensures retries do not double-charge

## Trade-offs

- Using `AsyncStorage` keeps complexity low, but a production banking app should use a robust local database (e.g., SQLite or Realm/Isar) and append-only logs for auditability
- NetInfo + UI toggle suffice for simulation; production should subscribe to OS-level network changes and handle captive portals
- Processor runs in the app runtime; production might offload to a background service with guaranteed execution semantics