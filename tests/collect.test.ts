import { describe, expect, it } from 'vitest';
import { WayaPayError } from '../src/index.js';
import { capturingFetch, makeClient, okBody, stubFetch } from './helpers.js';

const valid = {
  paymentLinkName: 'Order #1234',
  description: 'Order #1234 - 2 items',
  payableAmount: 1500,
  redirectLink: 'https://merchant.example.com/callback',
};

describe('collect.create', () => {
  it('validates required fields', async () => {
    const c = makeClient(stubFetch(200, okBody({})));
    await expect(c.collect.create({ paymentLinkName: 'x' } as never)).rejects.toBeInstanceOf(WayaPayError);
  });

  it('requires expiryDate when linkCanExpire is true', async () => {
    const c = makeClient(stubFetch(200, okBody({})));
    await expect(c.collect.create({ ...valid, linkCanExpire: true }))
      .rejects.toMatchObject({ type: 'validation', message: /expiryDate/ });
  });

  it('defaults link type and currency', async () => {
    const fetch = capturingFetch(200, okBody({ shortUrl: 'https://pay.test/x' }));
    await makeClient(fetch).collect.create(valid);
    const body = fetch.calls[0]!.body as Record<string, unknown>;
    expect(body['paymentLinkType']).toBe('ONE_TIME_PAYMENT_LINK');
    expect(body['currency']).toBe('NGN');
  });

  it('decodes the link and posts correctly', async () => {
    const fetch = capturingFetch(200, okBody({
      shortUrl: 'https://pay.test/abc',
      paymentLinkReference: 'PLR-1',
    }));
    const out = await makeClient(fetch).collect.create(valid);
    expect(out.shortUrl).toBe('https://pay.test/abc');
    expect(out.paymentLinkReference).toBe('PLR-1');
    expect(fetch.calls[0]!.url.pathname).toMatch(/\/payment-collect\/initiate$/);
  });
});
