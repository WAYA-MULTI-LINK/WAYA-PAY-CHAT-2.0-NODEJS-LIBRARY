

# WayaPay Node.js SDK

Official Node.js SDK for integrating with WayaPay payment APIs.

The SDK provides support for:

* Payment Collection
* Payouts
* Transaction Verification
* Bank Listing
* Account Verification

---

# Installation

```bash
npm install wayaquick-payment-sdk
```

---

# Requirements

* Node.js >= 16

---

# Initialization

```javascript
const WayaPayClient = require("@wayapay/nodesdk");

const client = new WayaPayClient({
  merchantId: "your-merchant-id",
  publicKey: "your-public-key",
  environment: "development", // development | production
});
```

---

# Environment

| Environment       | Value         |
| ----------------- | ------------- |
| Sandbox / Staging | `development` |
| Production        | `production`  |

---

# Initialize Payment

Initialize a payment collection request.

## Example

```javascript
const response = await client.initializePayment({
  currency: "NGN",
  amount: 5000,
  callBackUrl: "https://yourapp.com/payment/callback",
  idempotencyKey: `id-${Date.now()}`,
  paymentRef: `PAY-${Date.now()}`,

  metadata: {
    firstName: "John",
    lastName: "Doe",
    phoneNumber: "08012345678",
    emailAddress: "john@example.com",
    cancelUrl: "https://yourapp.com/payment/cancel",
  },
});

console.log(response);
```

## Request Parameters

| Field          | Type   | Required | Description                       |
| -------------- | ------ | -------- | --------------------------------- |
| currency       | String | Yes      | ISO currency code                 |
| amount         | Number | Yes      | Amount to charge                  |
| callBackUrl    | String | Yes      | Redirect URL after payment        |
| idempotencyKey | String | Yes      | Prevent duplicate transactions    |
| paymentRef     | String | Yes      | Unique merchant payment reference |
| metadata       | Object | Yes      | Customer details                  |

### Metadata

| Field        | Type   | Required |
| ------------ | ------ | -------- |
| firstName    | String | Yes      |
| lastName     | String | Yes      |
| phoneNumber  | String | Yes      |
| emailAddress | String | Yes      |
| cancelUrl    | String | No       |

---

# Initiate Payout

Transfer funds to a bank account.

## Example

```javascript
const response = await client.initiatePayout({
  currency: "NGN",
  amount: 1000,
  idempotencyKey: `payout-${Date.now()}`,
  bankCode: "058",
  accountNumber: "0123456789",
});

console.log(response);
```

---

# Verify Transaction

Verify transaction status using transaction reference.

## Example

```javascript
const response = await client.verifyTransaction(
  "TRX-123456789"
);

console.log(response);
```

---

# Fetch Bank List

Retrieve supported banks.

## Example

```javascript
const response = await client.fetchBankList();

console.log(response);
```

---

# Verify Account

Verify bank account details before payout.

## Example

```javascript
const response = await client.verifyAccount({
  accountNumber: "0123456789",
  bankCode: "058",
});

console.log(response);
```

---

# Successful Response Format

```json
{
  "status": true,
  "data": {
    "reference": "PAY-123456",
    "authorizationUrl": "https://checkout.url"
  }
}
```

---

# Error Response Format

```json
{
  "status": false,
  "message": "currency is required"
}
```

---

# Production Example

```javascript
const client = new WayaPayClient({
  merchantId: process.env.WAYAPAY_MERCHANT_ID,
  publicKey: process.env.WAYAPAY_SECRET_KEY,
  environment: "production",
});
```

---

# Security Recommendations

* Never expose your secret key publicly
* Always use environment variables
* Verify transactions server-side
* Use idempotency keys for retries

---

# Example `.env`

```env
WAYAPAY_MERCHANT_ID=your-merchant-id
WAYAPAY_SECRET_KEY=your-secret-key
```

---

# Support

For support and integration assistance:

* Website: [https://wayapay.ng](https://wayapay.ng)
* Email: [support@wayapay.ng](mailto:support@wayapay.ng)

---

# License

MIT License
