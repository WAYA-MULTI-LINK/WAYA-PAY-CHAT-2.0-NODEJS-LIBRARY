// Run with: node examples/usage.js
// Set WAYA_MERCHANT_ID and WAYA_SECRET_KEY in your environment first.

import { WayaPay, WayaPayError, generateReference } from '../src/index.js';

const client = new WayaPay({
  merchantId: process.env.WAYA_MERCHANT_ID,
  secretKey: process.env.WAYA_SECRET_KEY,
  environment: 'staging', // flip to 'production' when steady
});

async function main() {
  // 1. Banks
  const banks = await client.banks.list();
  console.log('Banks:', banks.length);

  // 2. Verify a destination before you ever move money
  const verified = await client.accounts.verify({
    accountNumber: '0123456789',
    bankCode: '044',
  });
  console.log('Resolved name:', verified.accountName);

  // 3. Mint a virtual account for an order
  const vacct = await client.accounts.createDynamic({
    accountName: 'ORDER-7821 PAYMENT',
    customerId: 'CUST-98765',
    referenceId: 'ORDER-7821',
    purpose: 'Order payment',
  });
  console.log('Pay into:', vacct.virtualAccountNumber);

  // 4. BVN check
  const bvn = await client.identity.verifyBvn('22212345678');
  console.log('BVN holder:', bvn.firstName, bvn.lastName, '| watchListed:', bvn.watchListed);

  // 5. Pay someone out. Verify the name above first.
  const payout = await client.payouts.initiate({
    amount: 25000,
    accountNumber: verified.accountNumber,
    bankCode: '058',
    accountName: verified.accountName,
    reference: generateReference('PAYOUT'),
    narration: 'Salary payment May 2026',
  });
  console.log('Payout:', payout.payoutReference, payout.status);

  // 6. Create a payment link
  const link = await client.collect.create({
    paymentLinkName: 'Order #1234',
    description: 'Order #1234 - 2 items',
    payableAmount: 1500,
    redirectLink: 'https://merchant.example.com/callback',
  });
  console.log('Send customer to:', link.shortUrl);

  // 7. Verify a transaction. Trust status, not your own assumptions.
  const txn = await client.transactions.verify(payout.payoutReference);
  console.log('Txn status:', txn.status);

  // 8. Reconcile every successful transaction in a window, one stream
  let count = 0;
  for await (const t of client.transactions.historyAll({
    status: 'SUCCESS',
    from: '2026-05-01T00:00:00Z',
    to: '2026-05-31T23:59:59Z',
  })) {
    count += 1;
    void t;
  }
  console.log('Reconciled:', count, 'transactions');
}

main().catch((err) => {
  if (err instanceof WayaPayError) {
    console.error(`[${err.type}] code=${err.code} status=${err.status} :: ${err.message}`);
  } else {
    console.error('Unexpected:', err);
  }
  process.exit(1);
});
