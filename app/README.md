# Resilient Euro Transfer System (Expo / React Native)

This app demonstrates a resilient mobile payment flow tailored for intermittent connectivity, with strict FIFO processing, optimistic UI, durable local queue, anti-fraud effective balance checks, and idempotent transactions.

## Run

- `npx expo start` (recommended for mobile Expo development)
  - Press `a` to open Android emulator or scan QR with Expo Go
  - Press `w` to open Web preview
  - Press `r` to reload

- Alternative: `npm run web` (web-only preview)

## Scenarios

- High-speed connection: Balance `€500` → send `€50` → UI shows `€450` → Completed
- Signal drop: Toggle "Disable Network" → send `€50` → UI `€450` → Pending → close/open app → re-enable network → Auto-sync → Completed
- Server rejection: send `€50`, mock 402 Insufficient Funds → balance rolls back → Failed
- Anti-fraud guard: with `€100` server balance, queue `€60` (display `€40`), attempt to queue another `€50` → blocked immediately

## Tests

- Unit: effective balance calculation, retry increments on network outage, rollback on 402
- Widget: optimistic balance update, anti-fraud disabled send

Run tests: `npm test`

## Notes

- Idempotency: every transaction has a UUID v4 `idempotencyKey`; retries reuse the same key
- Durable Buffer: persisted with `redux-persist` + `AsyncStorage`, survives app restarts
- FIFO: the queue is processed strictly oldest-first; B cannot process until A completes or fails