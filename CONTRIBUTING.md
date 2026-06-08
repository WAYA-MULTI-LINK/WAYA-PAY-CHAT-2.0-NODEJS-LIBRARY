# Contributing

## Requirements

- Node 18 or newer (`node --version`)
- npm

## Project layout

```
src/                          # TypeScript source — compiled to dist/ on build
  index.ts                    # Public barrel — exports the client, error, helpers, and types
  client.ts                   # WayaPay class — transport, retry loop, auth headers
  errors.ts                   # WayaPayError + WayaPayErrorType
  util.ts                     # generateReference (public), requireFields/backoff (internal)
  types.ts                    # All request/response interfaces
  resources/
    banks.ts                  # banks.list
    accounts.ts               # accounts.verify, accounts.createDynamic
    identity.ts               # identity.verifyBvn
    payouts.ts                # payouts.initiate
    collect.ts                # collect.create
    transactions.ts           # transactions.verify, history, historyAll

tests/                        # Vitest suite (black-box, via injected fetch)
  helpers.ts                  # stub/capturing/sequence fetch fakes + client builder
  client.test.ts              # Construction, headers, envelope, errors, retry, helpers
  banks.test.ts               # ... one file per resource
  accounts.test.ts
  identity.test.ts
  payouts.test.ts
  collect.test.ts
  transactions.test.ts
  live.test.ts                # Hits the real API — excluded from the default run

samples/
  usage.ts                    # Runnable end-to-end demo — kept in sync with the API

dist/                         # Build output (generated; gitignored)
```

The published package ships only `dist/` (JS + `.d.ts`), `README.md`, `CHANGELOG.md`, and `LICENSE`.

## Install

```bash
npm install
```

## Build, typecheck, test

```bash
npm run build       # tsc -p tsconfig.build.json  ->  dist/
npm run typecheck   # tsc --noEmit  (also covers tests + samples)
npm test            # vitest run
npm run test:watch  # vitest (watch mode)
```

Unit tests run entirely against an injected `fetch` (see `tests/helpers.ts`). No credentials, no network.

## Run live integration tests

Live tests hit the real WayaPay API and are excluded from the default run (see `vitest.config.ts`). Enable them with real credentials:

```bash
export WAYA_MERCHANT_ID=MER_...
export WAYA_SECRET_KEY=WAYASECK_TEST_...
# optional: export WAYA_ENV=production   (defaults to staging)

npm run test:live
```

Live tests are intentionally not run in CI to avoid flakiness from network conditions or credential availability.

## Run the sample

```bash
WAYA_MERCHANT_ID=MER_... WAYA_SECRET_KEY=WAYASECK_TEST_... npm run sample
```

## Adding a new feature

1. Add request/response types to `src/types.ts`.
2. Add the method to the relevant resource under `src/resources/` (keep methods `async`).
3. Validate required fields with `requireFields(...)` before the network call.
4. Export any new public types from `src/index.ts`.
5. Add unit tests covering the happy path, validation/error path, correct HTTP method/path, and request body shape — drive them with `capturingFetch`.
6. Update `samples/usage.ts` if the feature is user-facing.
7. Update `CHANGELOG.md` under the relevant version.

## Versioning

This project follows [Semantic Versioning](https://semver.org).

## Code style

- TypeScript `strict` (plus `noUncheckedIndexedAccess`); keep `npm run typecheck` clean.
- One resource per file; the resource constructor takes only the `WayaPay` client.
- All resource methods are `async` so every error — validation or API — surfaces as a rejection.
- Validate at the boundary with `requireFields` (type `validation`).
- Throw `WayaPayError` with the right `type` so callers can branch.
- No comments explaining *what* the code does — only add one when the *why* is non-obvious.
