# wayapay

Node.js client for the **WayaPay Merchant API v2**. Collect, payout, accounts, identity, and reconciliation in one small, zero dependency package.

This is a **server side** library. Your secret key lives here and only here. Never ship it to a browser, a mobile app, or a public repo. A leaked key is a wallet with the PIN on the back.

## Requirements

Node 18 or newer (uses native `fetch`). ESM only.

## Install

Drop the folder into your project, or once published:

```bash
npm install wayaquick-payment-sdk
```

## Quickstart

```js
import { WayaPay } from 'wayaquick-payment-sdk';

const client = new WayaPay({
  merchantId: process.env.WAYA_MERCHANT_ID,   // MER_...
  secretKey: process.env.WAYA_SECRET_KEY,     // WAYASECK_TEST_... or WAYASECK_...
  environment: 'staging',                     // 'staging' or 'production'
});

const banks = await client.banks.list();
```

Test against `staging` until your integration is steady, then change one word to `production`. The rest of your code stays the same.

## What you get back

Every method returns the envelope's `data` payload directly, already unwrapped. The `success`, `code`, and `timestamp` fields only matter when something fails, and failures throw. So the happy path stays clean:

```js
const acct = await client.accounts.verify({ accountNumber: '0123456789', bankCode: '044' });
console.log(acct.accountName); // straight to the useful part
```

## API

### Banks

```js
const banks = await client.banks.list();
// [{ code, name, id, status }, ...]
```

### Accounts

```js
// Resolve an account number to its registered name
const result = await client.accounts.verify({
  accountNumber: '0123456789',
  bankCode: '044',          // omit only when enquiryType is 'WAYABANK'
  enquiryType: 'OTHERS',    // default
});

// Mint a virtual NUBAN account for an order or customer
const vacct = await client.accounts.createDynamic({
  accountName: 'ORDER-7821 PAYMENT',
  customerId: 'CUST-98765',
  referenceId: 'ORDER-7821',   // auto generated if omitted
  purpose: 'Order payment',
  // mode defaults to 'ONE_TIME'
});
// Hand vacct.virtualAccountNumber to the customer
```

### Identity

```js
const bvn = await client.identity.verifyBvn('22212345678'); // 11 digits, validated locally
// treat anything other than "False" on bvn.watchListed with care
```

### Payouts

```js
const payout = await client.payouts.initiate({
  amount: 25000,
  accountNumber: '0123456789',
  bankCode: '058',
  accountName: 'JOHN DOE',     // match the verified name
  narration: 'Salary May 2026',
  // currency defaults to 'NGN', reference auto generated if omitted
});
// PROCESSING means accepted, not settled. Verify with the reference below.
```

### Collect

```js
const link = await client.collect.create({
  paymentLinkName: 'Order #1234',
  description: 'Order #1234 - 2 items',
  payableAmount: 1500,
  redirectLink: 'https://merchant.example.com/callback',
  // paymentLinkType defaults to 'ONE_TIME_PAYMENT_LINK', currency to 'NGN'
});
// Send the customer to link.shortUrl. Keep link.paymentLinkReference to reconcile.
```

If you set `linkCanExpire: true`, you must also pass `expiryDate`. The library enforces it before the call leaves your server.

### Transactions

```js
// Verify one transaction
const txn = await client.transactions.verify('WQ-TXN-9F8E7D6C');
// txn.status === 'SUCCESS' means settled

// One page of history
const page = await client.transactions.history({
  page: 0, size: 20, status: 'SUCCESS',
  from: '2026-05-01T00:00:00Z', to: '2026-05-24T00:00:00Z',
});

// Or stream every matching transaction across all pages (built for reconciliation)
for await (const t of client.transactions.historyAll({ status: 'SUCCESS' })) {
  // process t, the SDK walks the pages for you
}
```

## References

In v2, the unique `reference` you supply is your dedup and reconciliation key. Generate a fresh one per logical operation so retries map to the original record instead of spawning duplicates. The library auto fills it on payouts and dynamic accounts when you leave it out, or generate your own:

```js
import { generateReference } from 'wayapay';
const ref = generateReference('PAYOUT'); // PAYOUT-1748160000000-A1B2C3D4
```

## Errors

Everything that fails throws a `WayaPayError`. Branch on `type` for category and `code` for the WayaPay code.

```js
import { WayaPayError } from 'wayapay';

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

Validation errors fire **before** any network call, so a missing field or a malformed BVN never burns a request.

## Timeouts and retries

Configurable per client:

```js
new WayaPay({ merchantId, secretKey, timeout: 30000, maxRetries: 2 });
```

Retries apply to **GET only** (bank list, verify, history) and only on timeouts, network errors, 429, or 5xx, with exponential backoff. Writes (payout, collect, dynamic account, BVN) never auto retry, because retrying a write you are unsure about is how you pay someone twice. Retry those yourself, with the same `reference`, once you have checked the transaction status.

## Before you go live

On the merchant dashboard: finish KYC, grab your Merchant ID, generate your secret key under Settings then API Keys and Webhooks, whitelist your server IPs, and configure payment preferences. Payment Collect will refuse to work until the last two are done.
