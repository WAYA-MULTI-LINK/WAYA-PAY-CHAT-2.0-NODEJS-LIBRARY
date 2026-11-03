# WayaQuick Node.js & TypeScript SDK Documentation (v2.0.3)

Official integration guide for the **WayaQuick Merchant API v2** using the official Node.js / TypeScript SDK.

---

## 1. Package Overview

* **Package Name**: [`wayaquick-intergration`](https://www.npmjs.com/package/wayaquick-intergration)
* **Current Version**: `2.0.3`
* **Node Support**: Node.js 18 or newer (native `fetch`, zero runtime dependencies, ESM only)
* **TypeScript**: First-class bundled `.d.ts` types
* **Runnable Example**: [`samples/usage.ts`](samples/usage.ts)

### Installation

```bash
npm install wayaquick-intergration
```

---

## 2. Initialization & Authentication

All API operations require your **Merchant ID** (`MER_...`) and **Secret Key** (`WAYASECK_TEST_...` for sandbox, `WAYASECK_...` for live).

```typescript
import { WayaPay } from 'wayaquick-intergration';

const client = new WayaPay({
  merchantId: process.env.WAYA_MERCHANT_ID!, // MER_...
  secretKey: process.env.WAYA_SECRET_KEY!,   // WAYASECK_TEST_... or WAYASECK_...
  // Optional:
  // webhookSecret: process.env.WAYA_WEBHOOK_SECRET,
  // timeout: 30000, // default 30s
  // maxRetries: 2,  // default 2 (GET requests only)
});
```

> **Security Rule**: The Secret Key allows debiting your merchant account. **Never import or run this SDK client-side in React, Vue, Angular, or React Native.** All calls must originate from your secure backend server.

---

## 3. Core API Features

### 3.1. Reference Generation (Idempotency)

Use the built-in reference helper to generate timestamped, collision-resistant identifiers (`PAYOUT-1748160000000-A1B2C3D4`):

```typescript
import { generateReference } from 'wayaquick-intergration';

const ref = generateReference('PAYOUT');
```

---

### 3.2. List Banks (`GET /get-bank-list`)

Fetch supported banks and financial institutions in Nigeria with their CBN bank codes:

```typescript
const banks = await client.payouts.listBanks();
// Array of: { code: string, name: string, id: string, status: boolean }
console.log(`Found ${banks.length} banks.`);
```

---

### 3.3. Account Verification / Name Enquiry (`POST /verify-account`)

Always verify an account number before sending money:

```typescript
// Inter-bank transfer enquiry (requires bankCode):
const account = await client.payouts.verifyAccount({
  accountNumber: '0123456789',
  bankCode: '044',          // Access Bank
  enquiryType: 'OTHERS',    // Default: 'OTHERS'
});
console.log('Account Name:', account.accountName);

// Intra-bank transfer enquiry (Waya Bank to Waya Bank):
const wayaAccount = await client.payouts.verifyAccount({
  accountNumber: '0123456789',
  enquiryType: 'WAYA-BANK', // bankCode is not required
});
```

---

### 3.4. BVN Identity Verification (Two-Step OTP Flow)

In compliance with privacy regulations, BVN identity checks require customer consent via SMS OTP:

```typescript
// Step 1: Initiate verification (sends OTP to the BVN-registered phone)
const session = await client.identity.initiateBvn('22222222222'); // exactly 11 digits
console.log(`OTP sent to ${session.phoneNumber}. Session Reference: ${session.reference}`);

// Step 2: Complete verification with the OTP provided by the customer
const bvnRecord = await client.identity.completeBvn(session.reference, '123456');
console.log('Verified Customer:', bvnRecord.firstName, bvnRecord.lastName);
console.log('Watchlisted:', bvnRecord.watchListed); // Treat non-"False" with care
```

---

### 3.5. Disburse Payouts (`POST /payment-payout/initiate`)

Send funds from your merchant balance to any Nigerian bank account:

```typescript
import { payoutOutcome } from 'wayaquick-intergration';

// 1. Initiate transfer
const payout = await client.payouts.initiate({
  amount: 25000,
  currency: 'NGN',
  accountNumber: '0123456789',
  bankCode: '044',
  accountName: 'JOHN DOE',                   // optional
  reference: generateReference('PAYOUT'),
  narration: 'Salary Disbursement',          // optional
});

console.log('Payout submitted. Status:', payout.status); // "PROCESSING"

// 2. Reconcile transfer status using your reference:
const status = await client.payouts.getStatus(payout.merchantReference);
switch (payoutOutcome(status.status)) {
  case 'succeeded':
    console.log('Funds delivered.');
    break;
  case 'reversed':
    console.log('Transfer failed; wallet re-credited.');
    break;
  case 'reconciling':
    console.log('Transfer is in flight; poll again later.');
    break;
}
```

---

### 3.6. Payment Collections / Hosted Checkout (`POST /payment-collect/initiate`)

Collect payments from customers via Hosted Checkout (Cards, Bank Transfer, USSD, QR):

```typescript
import { collectionOutcome } from 'wayaquick-intergration';

// 1. Create Checkout Session
const checkout = await client.collect.create({
  transactionId: generateReference('TXN'),
  amount: '1500.00',
  currency: 'NGN',
  firstName: 'John',
  lastName: 'Doe',
  email: 'customer@example.com',
  phone: '08012345678',
  description: 'Order #1001',
  meta: { orderId: '1001' },
});

console.log('Redirect customer to checkout URL:', checkout.checkOutUrl);

// 2. Verify Deposit Status by transactionId / gateway refNo
const collectStatus = await client.collect.getStatus(checkout.transactionId);
if (collectionOutcome(collectStatus.status) === 'succeeded') {
  console.log(`Payment confirmed! Amount paid: ${collectStatus.amountPaid}. Fulfil order.`);
}
```

---

### 3.7. Inbound Webhook Verification

WayaQuick POSTs webhook notifications whenever a transaction reaches `SUCCESSFUL`, `PARTIAL`, or `FAILED`.

```typescript
import express from 'express';
import { WayaPay, WayaPayWebhookError } from 'wayaquick-intergration';

const app = express();

// IMPORTANT: Webhook signatures MUST be verified against raw, unparsed request bytes!
app.post('/webhook/waya', express.raw({ type: 'application/json' }), (req, res) => {
  const rawBody = req.body.toString('utf8');
  const timestamp = req.headers['x-waya-timestamp'] as string;
  const signature = req.headers['x-waya-signature'] as string;

  try {
    const event = client.webhooks.constructEvent(
      rawBody,
      timestamp,
      signature,
      process.env.WAYA_SECRET_KEY!
    );

    if (event.status === 'SUCCESSFUL') {
      // Fulfil order using event.orderId as the idempotency key
      console.log(`Order ${event.orderId} paid successfully: ${event.amount} ${event.currency}`);
    }

    res.status(200).send('OK');
  } catch (err) {
    if (err instanceof WayaPayWebhookError) {
      console.error('Invalid webhook signature or stale timestamp:', err.message);
      res.status(401).send('Unauthorized');
    } else {
      res.status(500).send('Server Error');
    }
  }
});
```

---

## 4. Error Handling

All failed calls throw a `WayaPayError`:

```typescript
import { WayaPayError } from 'wayaquick-intergration';

try {
  await client.payouts.initiate({ /* ... */ });
} catch (err) {
  if (err instanceof WayaPayError) {
    console.error('Error Type:', err.type);    // 'api' | 'validation' | 'network' | 'timeout'
    console.error('API Code:', err.code);      // e.g. "07" (null if non-API error)
    console.error('HTTP Status:', err.status); // e.g. 400, 401, 500
    console.error('Message:', err.message);
    console.error('Raw Payload:', err.raw);
  }
}
```

---

## 5. Runnable Example Document

The SDK ships with a complete runnable demo covering every resource:

* **File Location**: [`samples/usage.ts`](samples/usage.ts)
* **Run Command**:
  ```bash
  WAYA_MERCHANT_ID=MER_... WAYA_SECRET_KEY=WAYASECK_TEST_... npm run sample
  ```

---

## 6. Parseable AI Text (Copy & Paste for LLMs)

Copy the prompt block below to give any AI coding tool complete knowledge of how to use this library:

```xml
<wayaquick_nodejs_sdk_context version="2.0.3">
  <system_role>
    You are an expert backend TypeScript engineer integrating the official WayaQuick (WayaPay) Node.js SDK (package `wayaquick-intergration`).
    Adhere strictly to the v2 API contract and method signatures below.
  </system_role>

  <rules>
    1. SERVER-SIDE ONLY: Never use `wayaquick-intergration` in client-side / frontend code. Secret keys must remain secure.
    2. BVN 2-STEP OTP: BVN verification requires `client.identity.initiateBvn(bvn)` (sends OTP) followed by `client.identity.completeBvn(reference, otp)`. Single-step verification is deprecated.
    3. ACCOUNT ENQUIRY: `client.payouts.verifyAccount({ accountNumber, bankCode, enquiryType })`. If `enquiryType === 'WAYA-BANK'`, `bankCode` is not required.
    4. HOSTED CHECKOUT: `client.collect.create({ transactionId, amount, currency, firstName, lastName, email, phone, description, meta })`. Redirect customer to `res.checkOutUrl`.
    5. PAYOUTS ARE ASYNC: `client.payouts.initiate(...)` returns status `PROCESSING`. Reconcile by polling `client.payouts.getStatus(merchantReference)` or via webhooks.
    6. WEBHOOK RAW BODY: `client.webhooks.constructEvent(rawBodyString, timestamp, signature, secretKey)`. Always verify using the unparsed raw string before JSON body parsers.
  </rules>

  <package_info>
    <package_name>wayaquick-intergration</package_name>
    <version>2.0.3</version>
    <install>npm install wayaquick-intergration</install>
    <sample_file>samples/usage.ts</sample_file>
  </package_info>

  <code_template>
    <![CDATA[
import { WayaPay, generateReference, payoutOutcome, collectionOutcome } from 'wayaquick-intergration';

const client = new WayaPay({
  merchantId: process.env.WAYA_MERCHANT_ID!,
  secretKey: process.env.WAYA_SECRET_KEY!,
});

// 1. List Banks
const banks = await client.payouts.listBanks();

// 2. Verify Account
const verified = await client.payouts.verifyAccount({
  accountNumber: '0123456789',
  bankCode: '044',
  enquiryType: 'OTHERS',
});

// 3. BVN 2-Step OTP
const session = await client.identity.initiateBvn('22222222222');
const bvnProfile = await client.identity.completeBvn(session.reference, '123456');

// 4. Send Payout
const payout = await client.payouts.initiate({
  amount: 25000,
  accountNumber: verified.accountNumber,
  bankCode: '044',
  accountName: verified.accountName,
  reference: generateReference('PAYOUT'),
  narration: 'Salary Disbursement',
});
const payoutStatus = await client.payouts.getStatus(payout.merchantReference);

// 5. Payment Collection
const checkout = await client.collect.create({
  transactionId: generateReference('TXN'),
  amount: '1500.00',
  currency: 'NGN',
  firstName: 'John',
  lastName: 'Doe',
  email: 'customer@example.com',
  phone: '08012345678',
  description: 'Order #1001',
});
// Redirect customer to checkout.checkOutUrl
const collectStatus = await client.collect.getStatus(checkout.transactionId);
    ]]>
  </code_template>
</wayaquick_nodejs_sdk_context>
```

