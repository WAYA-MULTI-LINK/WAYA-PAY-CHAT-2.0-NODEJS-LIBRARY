# WayaPay Node.js

Node.js/TypeScript client for the **WayaPay Merchant API v2**. Collect payments, send payouts, mint virtual accounts, verify bank accounts, run BVN identity checks, and reconcile transactions in Nigeria.

One client, six resources, a single transport that handles auth headers and the shared response envelope so you never parse `success`/`code` by hand. Written in TypeScript, shipped as compiled JavaScript with bundled type declarations. **Zero runtime dependencies** — native `fetch`, Node 18+. **Server-side only** — your secret key must never leave your server.

## Requirements

Node 18 or newer (uses native `fetch`). ESM only. Ships with TypeScript types.

## Install

```bash
npm install wayaquick-intergration
```

## Quickstart

```ts
import { WayaPay } from 'wayaquick-intergration';

const client = new WayaPay({
  merchantId: process.env.WAYA_MERCHANT_ID!,   // MER_...
  secretKey: process.env.WAYA_SECRET_KEY!,     // WAYASECK_TEST_... or WAYASECK_...
});

const banks = await client.payouts.listBanks();
```

The client targets the production base URL. Test with a `WAYASECK_TEST_...` key, then swap in your live `WAYASECK_...` key when ready — the rest of your code stays the same. Pass `baseUrl` to point at a different host.

## What you get back

Every method returns the envelope's `data` payload directly, already unwrapped and typed. The `success`, `code`, and `timestamp` fields only matter when something fails — and failures throw — so the happy path stays clean:

```ts
const acct = await client.payouts.verifyAccount({ accountNumber: '0123456789', bankCode: '044' });
console.log(acct.accountName); // typed VerifyAccountResult — straight to the useful part
```

## List banks

```ts
const banks = await client.payouts.listBanks();
// Bank[] — each has { code, name, id, status }
```

## Verify an account

Always verify before sending a payout — confirms the account exists and returns the registered name.

```ts
const result = await client.payouts.verifyAccount({
  accountNumber: '0123456789',
  bankCode: '044',          // omit when enquiryType is 'WAYA-BANK' (or 'WAYABANK')
  enquiryType: 'OTHERS',    // 'OTHERS' (inter-bank, default) or 'WAYA-BANK' (intra-bank)
});
console.log(result.accountName); // "JOHN DOE"
```

## Initiate a payout

```ts
const payout = await client.payouts.initiate({
  amount: 25000,
  accountNumber: '0123456789',
  bankCode: '058',
  accountName: 'JOHN DOE',     // optional, match the verified name
  narration: 'April salary',   // optional statement narration
  // currency defaults to 'NGN', reference auto-generated if omitted
});
// payout.status === 'PROCESSING' means accepted, not settled

// Reconcile by the reference you sent at initiation:
const status = await client.payouts.getStatus(payout.merchantReference);
// interpret status.status with payoutOutcome / isPayoutTerminal
```

## Collect a payment

```ts
const res = await client.collect.create({
  transactionId: 'TXN-V2-20260604-01',
  amount: '1500.00',
  currency: 'NGN',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '08012345678',
  description: 'Order #1234',
  meta: { orderId: '1234' },
});
// Redirect the customer to res.checkOutUrl to complete payment.
// Confirm the result on your server before fulfilling the order.

// Reconcile a deposit by its refNo (the gateway transactionId / webhook orderId):
const collectStatus = await client.collect.getStatus(refNo);
// interpret collectStatus.status with collectionOutcome / isCollectionTerminal
```

## BVN identity check

Verification takes two steps: submitting the BVN sends an OTP to the phone number registered against it, and the holder's record is returned once that OTP is verified.

```ts
// Step 1: Initiate verification (sends OTP)
const started = await client.identity.initiateBvn('22222222222'); // 11 digits, validated locally
console.log(started.reference, started.phoneNumber);

// Step 2: Complete verification with the received OTP
const bvn = await client.identity.completeBvn(started.reference, '123456');
console.log(bvn.firstName, bvn.lastName);
// treat anything other than "False" on bvn.watchListed with care
```

BVN data is sensitive personal information. Store, transmit, and log it only as your data-protection obligations allow.

A payout returning `PROCESSING` is accepted, not settled. Poll `payouts.getStatus` with the reference until it reaches a terminal status.

## The resources

| Resource | Method | Endpoint |
|---|---|---|
| `client.payouts` | `listBanks` | `GET /get-bank-list` |
| `client.payouts` | `verifyAccount` | `POST /verify-account` |
| `client.payouts` | `initiate` | `POST /payment-payout/initiate` |
| `client.payouts` | `getStatus` | `GET /payment-payout/status/{reference}` |
| `client.collect` | `create` | `POST /payment-collect/initiate` |
| `client.collect` | `getStatus` | `GET /payment-collect/status/{refNo}` |
| `client.identity` | `initiateBvn` | `POST /identity-verification/bvn/initiate` |
| `client.identity` | `completeBvn` | `POST /identity-verification/bvn/complete` |
| `client.webhooks` | `constructEvent` / `verifySignature` | — (verifies inbound webhooks) |

## References

In v2, the unique `reference` you supply is your dedup and reconciliation key. Generate a fresh one per logical operation so retries map to the original record instead of spawning duplicates. The library auto-fills it on payouts when you leave it out, or generate your own:

```ts
import { generateReference } from 'wayaquick-intergration';
const ref = generateReference('PAYOUT'); // PAYOUT-1748160000000-A1B2C3D4
```

## Errors

Everything that fails throws (rejects with) a `WayaPayError`. Branch on `type` for the category and `code` for the WayaPay code.

```ts
import { WayaPayError } from 'wayaquick-intergration';

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

Retries apply to **GET only** (bank list, status checks) and only on timeouts, network errors, 429, or 5xx, with exponential backoff. Writes (payout, account verify, collect, BVN) never auto-retry, because retrying a write you are unsure about is how you pay someone twice. Retry those yourself, with the same `reference`, once you have checked the transaction status.

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
