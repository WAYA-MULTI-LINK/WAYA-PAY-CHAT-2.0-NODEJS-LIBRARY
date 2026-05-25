# WayaPay

WAYA-PAY REST CLIENT NODEJS LIBRARY

## Installation

```bash
npm install --save wayaquick-payment
```

## Usage

```javascript
const WayaPayRestClient = require('wayaquick-payment');

const wayapay = new WayaPayRestClient(
  "MER_qZaVZ1645265780823HOaZW",         // merchantId
  "WAYAPUBK_TEST_0x3442f06c8fa6454e90c5b1a518758c70", // publicKey (API Secret Key)
  process.env.NODE_ENV                    // "development" | "production"
);
```

---

### 1. Initialize Payment

Initiates a payment collection and returns a hosted payment page URL. Redirect the customer to `paymentUrl` to complete the transaction.

```javascript
wayapay.initializePayment({
  currency: "NGN",
  amount: 1500.00,
  callBackUrl: "https://yoursite.com/payment/callback",
  idempotencyKey: "unique-key-001",
  paymentRef: "your-unique-payment-ref",
  metadata: {
    firstName: "John",
    lastName: "Doe",
    phoneNumber: "09087654321",
    emailAddress: "johndoe@gmail.com",
    cancelUrl: "https://yoursite.com/payment/cancel", // optional
  },
}).then((result) => {
  console.log(result);
}).catch((error) => {
  console.log(error);
});
```

---

### 2. Initiate Payout

Sends funds from your merchant balance to a bank account. Always [verify the destination account](#5-verify-account) before calling this.

```javascript
wayapay.initiatePayout({
  currency: "NGN",
  amount: 1500.00,
  idempotencyKey: "idem-payout-2026-05-13-001",
  bankCode: "011",
  accountNumber: "0123456789",
}).then((result) => {
  console.log(result);
}).catch((error) => {
  console.log(error);
});
```

---

### 3. Verify Transaction

Retrieves the current status of a transaction by reference. Use this after a payout or to confirm a payment collection.

```javascript
// transactionRef is returned from initializePayment or initiatePayout
wayapay.verifyTransaction(transactionRef)
  .then((result) => {
    console.log(result);
  }).catch((error) => {
    console.log(error);
  });
```

---

### 4. Fetch Bank List

Returns the list of supported banks and their codes. Use these codes when calling `initiatePayout` or `verifyAccount`.

```javascript
wayapay.fetchBankList()
  .then((result) => {
    console.log(result);
  }).catch((error) => {
    console.log(error);
  });
```

---

### 5. Verify Account

Resolves an account number against a bank and returns the registered account name. Always call this before initiating a payout.

```javascript
wayapay.verifyAccount({
  accountNumber: "0123456789",
  bankCode: "011",
}).then((result) => {
  console.log(result);
}).catch((error) => {
  console.log(error);
});
```

---

## License
[MIT](https://github.com/WAYA-MULTI-LINK/WAYA-PAY-CHAT-2.0-NODEJS-LIBRARY/blob/main/LICENSE)