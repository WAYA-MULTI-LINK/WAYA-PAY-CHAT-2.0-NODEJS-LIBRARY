import { describe, expect, it } from 'vitest';
import { WayaPayError } from '../src/index.js';
import { capturingFetch, makeClient, okBody, stubFetch } from './helpers.js';

const valid = {
  transactionId: 'TXN-V2-20260604-01',
  amount: '1500.00',
  currency: 'NGN',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '08012345678',
  description: 'Order #1234',
  meta: { orderId: '1234' },
};

describe('collect.create', () => {
  it('validates required fields', async () => {
    const c = makeClient(stubFetch(200, okBody({})));
    await expect(c.collect.create({ firstName: 'John' } as never)).rejects.toBeInstanceOf(WayaPayError);
  });

  it('defaults currency to NGN', async () => {
    const fetch = capturingFetch(200, okBody({ checkOutUrl: 'https://pay.wayaquick.com/?_tranId=123' }));
    const { currency, ...withoutCurrency } = valid;
    await makeClient(fetch).collect.create(withoutCurrency as never);
    const body = fetch.calls[0]!.body as Record<string, unknown>;
    expect(body['currency']).toBe('NGN');
  });

  it('decodes the checkout response and posts correctly', async () => {
    const fetch = capturingFetch(200, okBody({
      uniqueId: 'TXN-V2-20260604-01',
      transactionId: '178056425312256824',
      email: 'john@example.com',
      amount: '1500.00',
      checkOutUrl: 'https://pay.wayaquick.com/?_tranId=178056425312256824',
      merchantId: 'MER_LOfV71779980928158w7MEX',
      expiresAt: '2026-06-04T09:40:00Z',
    }));
    const out = await makeClient(fetch).collect.create(valid);
    expect(out.checkOutUrl).toBe('https://pay.wayaquick.com/?_tranId=178056425312256824');
    expect(out.transactionId).toBe('178056425312256824');
    expect(fetch.calls[0]!.url.pathname).toMatch(/\/payment-collect\/initiate$/);
    expect(fetch.calls[0]!.body).toMatchObject({
      transactionId: 'TXN-V2-20260604-01',
      amount: '1500.00',
      firstName: 'John',
      lastName: 'Doe',
    });
  });

  it('works via client.initiatePayment helper', async () => {
    const fetch = capturingFetch(200, okBody({
      checkOutUrl: 'https://pay.wayaquick.com/?_tranId=178056425312256824',
    }));
    const out = await makeClient(fetch).initiatePayment(valid);
    expect(out.checkOutUrl).toBe('https://pay.wayaquick.com/?_tranId=178056425312256824');
  });
});
