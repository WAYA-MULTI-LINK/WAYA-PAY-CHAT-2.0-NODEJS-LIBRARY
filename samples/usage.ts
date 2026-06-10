// Runnable end-to-end demo. Run with:
//   WAYA_MERCHANT_ID=MER_... WAYA_SECRET_KEY=WAYASECK_TEST_... npm run sample
//
// In your own project, import from the package instead of the source:
//   import { WayaPay, WayaPayError, generateReference } from 'wayaquick-payment-sdk';

import { createHmac } from 'node:crypto';
import {
  WayaPay,
  WayaPayError,
  WayaPayWebhookError,
  generateReference,
  payoutOutcome,
  collectionOutcome,
  shouldFulfil,
} from '../src/index.js';

async function main(): Promise<void> {
  const client = new WayaPay({
    merchantId: process.env.WAYA_MERCHANT_ID ?? '',
    secretKey: process.env.WAYA_SECRET_KEY ?? '',
    // Defaults to the production base URL; pass `baseUrl` to override.
  });

  // 1. Banks (GET — auto retried on transient failures).
  const banks = await client.banks.list();
  console.log('Banks:', banks.length);

  // 2. Verify a destination before you ever move money.
  const verified = await client.accounts.verify({
    accountNumber: '0123456789',
    bankCode: '044',
  });
  console.log('Resolved name:', verified.accountName);

  // 3. Mint a virtual account for an order.
  const vacct = await client.accounts.createDynamic({
    accountName: 'ORDER-7821 PAYMENT',
    customerId: 'CUST-98765',
    referenceId: 'ORDER-7821',
    purpose: 'Order payment',
  });
  console.log('Pay into:', vacct.virtualAccountNumber);

  // 4. BVN check.
  const bvn = await client.identity.verifyBvn('22212345678');
  console.log('BVN holder:', bvn.firstName, bvn.lastName, '| watchListed:', bvn.watchListed);

  // 5. Pay someone out. Verify the name above first.
  const payout = await client.payouts.initiate({
    amount: 25000,
    accountNumber: verified.accountNumber,
    bankCode: '058',
    accountName: verified.accountName,
    reference: generateReference('PAYOUT'),
    narration: 'Salary payment',
  });
  console.log('Payout:', payout.payoutReference, payout.status);

  // 5b. Check payout status — reconcile by the reference you sent at initiation.
  const payoutStatus = await client.payouts.getStatus(payout.merchantReference ?? payout.payoutReference);
  switch (payoutOutcome(payoutStatus.status)) {
    case 'succeeded':
      console.log('Payout delivered.');
      break;
    case 'reversed':
      console.log('Payout reversed — wallet re-credited.');
      break;
    case 'reconciling':
      console.log('Payout still reconciling — check again later.');
      break;
  }

  // 6. Create a payment link.
  const link = await client.collect.create({
    paymentLinkName: 'Order #1234',
    description: 'Order #1234 - 2 items',
    payableAmount: 1500,
    redirectLink: 'https://merchant.example.com/callback',
  });
  console.log('Send customer to:', link.shortUrl);

  // 6b. Check collection status — the pull/safety-net path alongside the webhook.
  const collectStatus = await client.collect.getStatus(link.paymentLinkReference);
  console.log('Collection status:', collectStatus.status, '(paid', collectStatus.amountPaid, ')');
  if (collectionOutcome(collectStatus.status) === 'succeeded') {
    console.log('Funds confirmed — fulfil order using refNo', collectStatus.refNo);
  }

  // 7. Verify a transaction. Trust status, not your own assumptions.
  const txn = await client.transactions.verify(payout.payoutReference);
  console.log('Txn status:', txn.status);

  // 8. Reconcile every successful transaction in a window, one stream.
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

  // 9. Verify a webhook (offline demo). In production WayaPay POSTs this to your
  //    HTTPS endpoint; here we sign a sample body locally to show the flow end to end.
  const webhookSecret = 'WAYASECK_TEST_demo_webhook_secret';
  const rawBody = JSON.stringify({
    OrderId: '1779662251460508970',
    Amount: 1500.0,
    Fee: 15.0,
    Currency: 'NGN',
    Status: 'SUCCESSFUL',
    productName: 'CARD',
    customer: { email: 'john@example.com' },
    merchantId: 'MER_xyz',
    recurrentPayment: false,
  });
  const timestamp = Date.now().toString();
  const signature = createHmac('sha256', webhookSecret).update(`${timestamp}.${rawBody}`).digest('base64');

  // A client constructed with `webhookSecret` can drop the secret arg:
  //   const verifier = new WayaPay({ ..., webhookSecret });
  //   verifier.webhooks.constructEvent(rawBody, timestamp, signature);
  const verifier = new WayaPay({ merchantId: client.merchantId, secretKey: client.secretKey, webhookSecret });
  try {
    const evt = verifier.webhooks.constructEvent(rawBody, timestamp, signature);
    console.log(`Webhook verified: ${evt.orderId} — ${evt.status} (${evt.amount} ${evt.currency})`);
    if (shouldFulfil(evt)) {
      console.log('  Fulfil order — idempotency key', evt.orderId);
    }
  } catch (e) {
    if (e instanceof WayaPayWebhookError) {
      console.error('Rejected webhook:', e.message);
    } else {
      throw e;
    }
  }
}

main().catch((err: unknown) => {
  if (err instanceof WayaPayError) {
    console.error(`[${err.type}] code=${err.code} status=${err.status} :: ${err.message}`);
  } else {
    console.error('Unexpected:', err);
  }
  process.exit(1);
});
