# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org).

## [2.0.0] - 2026-06-06

Rewritten in TypeScript and restructured into a proper package (`src/` TypeScript
source, compiled to `dist/` JavaScript with bundled `.d.ts`, plus `tests/` and
`samples/`). **Zero runtime dependencies** — native `fetch`, Node 18+.

### Added

- `WayaPay` client constructed from a typed options object (`merchantId`, `secretKey`, `baseUrl`, `timeout`, `maxRetries`, `fetch`). Defaults to the production base URL.
- Four resources mirroring the .NET library: `payouts`, `collect`, `identity`, `webhooks`.
- `payouts.listBanks()` — returns all supported banks and their CBN codes.
- `payouts.verifyAccount()` — resolves an account number to its registered name; requires `bankCode` unless `enquiryType` is `WAYABANK`.
- `payouts.initiate()` — initiates a bank transfer; defaults `currency` to `NGN` and auto-generates `reference`; `PROCESSING` means accepted, not settled.
- `payouts.getStatus()` — returns the latest status of a payout by the reference you sent at initiation.
- `collect.create()` — creates a payment link; defaults a one-time NGN link; requires `expiryDate` when `linkCanExpire` is true.
- `collect.getStatus()` — returns the current state of a deposit by its `refNo`.
- `identity.verifyBvn()` — verifies a BVN with a local 11-digit check before the network call; accepts a string or `{ bvn }`.
- `webhooks.constructEvent()` / `webhooks.verifySignature()` — verify and parse inbound transaction webhooks.
- `generateReference()` — timestamped, collision-resistant idempotency key.
- `WayaPayError` carrying `type`, `code`, `status`, and `raw`.
- Automatic retry with exponential backoff on GET requests (timeouts, network errors, 429, 5xx); writes never auto-retry.
- Injectable `fetch` for dependency injection and testing.
- Vitest test suite driven by stub/capturing/sequence fetch fakes, plus a live integration suite excluded from the default run.

### Changed from 1.x

- The library is now authored in TypeScript under `src/`; the published package exposes `dist/index.js` (ESM) and `dist/index.d.ts`. The hand-written root `index.d.ts` is gone — types are generated from source.
- All resource methods are `async`, so validation errors now reject (rather than throw synchronously). Catch them with `try/catch` or `.catch()` like any other failure.
- The example moved to `samples/usage.ts` and is run with `npm run sample`.
