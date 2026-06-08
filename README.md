# WayaPay Node.js

Node.js/TypeScript client for the **WayaPay Merchant API v2**. Collect payments, send payouts, mint virtual accounts, verify bank accounts, run BVN identity checks, and reconcile transactions in Nigeria.

One client, six resources, a single transport that handles auth headers and the shared response envelope so you never parse `success`/`code` by hand. Written in TypeScript, shipped as compiled JavaScript with bundled type declarations. **Zero runtime dependencies** — native `fetch`, Node 18+. **Server-side only** — your secret key must never leave your server.

## Requirements

Node 18 or newer (uses native `fetch`). ESM only. Ships with TypeScript types.

## Install

```bash
npm install wayaquick-payment-sdk
```

## Quickstart

```ts
import { WayaPay } from 'wayaquick-payment-sdk';

const client = new WayaPay({
  merchantId: process.env.WAYA_MERCHANT_ID!,   // MER_...
  secretKey: process.env.WAYA_SECRET_KEY!,     // WAYASECK_TEST_... or WAYASECK_...
});

const banks = await client.banks.list();
```

The client targets the production base URL. Test with a `WAYASECK_TEST_...` key, then swap in your live `WAYASECK_...` key when ready — the rest of your code stays the same. Pass `baseUrl` to point at a different host.

## What you get back

Every method returns the envelope's `data` payload directly, already unwrapped and typed. The `success`, `code`, and `timestamp` fields only matter when something fails — and failures throw — so the happy path stays clean:

```ts
const acct = await client.accounts.verify({ accountNumber: '0123456789', bankCode: '044' });
console.log(acct.accountName); // typed VerifyAccountResult — straight to the useful part
```

## List banks

```ts
const banks = await client.banks.list();
// Bank[] — each has { code, name, id, status }
```

## Verify an account

Always verify before sending a payout — confirms the account exists and returns the registered name.

```ts
const result = await client.accounts.verify({
  accountNumber: '0123456789',
  bankCode: '044',          // omit only when enquiryType is 'WAYABANK'
  enquiryType: 'OTHERS',    // default
});
console.log(result.accountName); // "JOHN DOE"
```

## Initiate a payout

```ts
const payout = await client.payouts.initiate({
  amount: 25000,
  accountNumber: '0123456789',
  bankCode: '058',
  accountName: 'JOHN DOE',     // match the verified name
  narration: 'April salary',
  // currency defaults to 'NGN', reference auto-generated if omitted
});
// payout.status === 'PROCESSING' means accepted, not settled
```

## Collect a payment

```ts
const link = await client.collect.create({
  paymentLinkName: 'Order #1234',
  description: 'Order #1234 - 2 items',
  payableAmount: 1500,
  redirectLink: 'https://merchant.example.com/callback',
  // paymentLinkType defaults to 'ONE_TIME_PAYMENT_LINK', currency to 'NGN'
});
// Send the customer to link.shortUrl. Keep link.paymentLinkReference to reconcile.
```

If you set `linkCanExpire: true`, you must also pass `expiryDate`. The library enforces it before the call leaves your server. `collect.create` also fails unless you have whitelisted your server IPs and configured payment preferences on the dashboard.

## Mint a virtual account

```ts
const vacct = await client.accounts.createDynamic({
  accountName: 'ORDER-7821 PAYMENT',
  customerId: 'CUST-98765',
  purpose: 'Order payment',
  // referenceId auto-generated if omitted; mode defaults to 'ONE_TIME'
});
// Hand vacct.virtualAccountNumber to the customer.
```

## BVN identity check

```ts
const bvn = await client.identity.verifyBvn('22212345678'); // 11 digits, validated locally
console.log(bvn.firstName, bvn.lastName);
// treat anything other than "False" on bvn.watchListed with care
```

BVN data is sensitive personal information. Store, transmit, and log it only as your data-protection obligations allow.

## Verify a transaction / reconcile

```ts
// Verify one transaction
const txn = await client.transactions.verify('WQ-TXN-9F8E7D6C');
// txn.status === 'SUCCESS' means settled

// One page of history
const page = await client.transactions.history({ page: 0, size: 20, status: 'SUCCESS' });

// Or stream every matching transaction across all pages (built for reconciliation)
for await (const t of client.transactions.historyAll({ status: 'SUCCESS' })) {
  // process t — the SDK walks the pages for you lazily
}
```

A payout returning `PROCESSING` is accepted, not settled. Poll `transactions.verify` with the reference until you see `SUCCESS`.

## The resources

| Resource | Method | Endpoint |
|---|---|---|
| `client.banks` | `list` | `GET /account-enquiry/get-bank-list` |
| `client.accounts` | `verify` | `POST /account-enquiry/verify-account` |
| `client.accounts` | `createDynamic` | `POST /account-enquiry/create-dynamic-account` |
| `client.identity` | `verifyBvn` | `POST /identity-verification/bvn` |
| `client.payouts` | `initiate` | `POST /payment-payout/initiate` |
| `client.collect` | `create` | `POST /payment-collect/initiate` |
| `client.transactions` | `verify` | `GET /transaction/verify` |
| `client.transactions` | `history` / `historyAll` | `GET /transaction/history` |

## References

In v2, the unique `reference` you supply is your dedup and reconciliation key. Generate a fresh one per logical operation so retries map to the original record instead of spawning duplicates. The library auto-fills it on payouts and dynamic accounts when you leave it out, or generate your own:

```ts
import { generateReference } from 'wayaquick-payment-sdk';
const ref = generateReference('PAYOUT'); // PAYOUT-1748160000000-A1B2C3D4
```

## Errors

Everything that fails throws (rejects with) a `WayaPayError`. Branch on `type` for the category and `code` for the WayaPay code.

```ts
import { WayaPayError } from 'wayaquick-payment-sdk';

try {
  await client.payouts.initiate({ /* ... */ });
} catch (err) {
  if (err instanceof WayaPayError) {
    err.type;    // 'api' | 'validation' | 'network' | 'timeout' | 'config'
    err.code;    // WayaPay code, e.g. "07". null when not an API error.
    err.status;  // HTTP status when known
    err.message; // human readable
    err.raw;     // raw body or underlying error, for your logs
  }
}
```

Validation errors reject **before** any network call, so a missing field or a malformed BVN never burns a request.

## Timeouts and retries

Configurable per client:

```ts
new WayaPay({ merchantId, secretKey, timeout: 30000, maxRetries: 2 });
```

Retries apply to **GET only** (bank list, verify, history) and only on timeouts, network errors, 429, or 5xx, with exponential backoff. Writes (payout, collect, dynamic account, BVN) never auto-retry, because retrying a write you are unsure about is how you pay someone twice. Retry those yourself, with the same `reference`, once you have checked the transaction status.

## Inject your own fetch (DI, testing)

Pass a `fetch` implementation to test without touching the network, or to add proxies/tracing. It must match the WHATWG `fetch` signature.

```ts
const client = new WayaPay({
  merchantId: 'm',
  secretKey: 's',
  fetch: async () =>
    new Response(JSON.stringify({ success: true, code: '00', data: [] }), { status: 200 }),
});
```

This is exactly how the test suite runs — see [tests/](tests/).

## Full example

See [samples/usage.ts](samples/usage.ts) for a runnable end-to-end demo covering every resource.

```bash
WAYA_MERCHANT_ID=MER_... WAYA_SECRET_KEY=WAYASECK_TEST_... npm run sample
```

## Building from source

```bash
npm install
npm run build       # tsc -> dist/ (JS + .d.ts)
npm test            # vitest
npm run typecheck   # tsc --noEmit
```

## Before you go live

On the merchant dashboard: finish KYC, grab your Merchant ID, generate your secret key under **Settings → API Keys and Webhooks**, whitelist your server IPs, and configure payment preferences. Payment Collect refuses to work until the last two are done. Then swap your `WAYASECK_TEST_...` key for the live `WAYASECK_...` key — the rest of your code stays the same.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
