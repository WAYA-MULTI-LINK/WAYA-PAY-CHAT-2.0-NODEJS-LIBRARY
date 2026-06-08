import { describe, expect, it } from 'vitest';
import { WayaPayError } from '../src/index.js';
import { capturingFetch, makeClient, okBody, stubFetch } from './helpers.js';

const valid = {
  amount: 5000,
  accountNumber: '0123456789',
  bankCode: '044',
  accountName: 'JOHN DOE',
  narration: 'Test payout',
};

describe('payouts.initiate', () => {
  it('validates required fields', async () => {
    const c = makeClient(stubFetch(200, okBody({})));
    await expect(c.payouts.initiate({ amount: 5000 } as never)).rejects.toBeInstanceOf(WayaPayError);
  });

  it('defaults currency to NGN and auto-generates a reference', async () => {
    const fetch = capturingFetch(200, okBody({ status: 'PROCESSING' }));
    await makeClient(fetch).payouts.initiate(valid);
    const body = fetch.calls[0]!.body as Record<string, unknown>;
    expect(body['currency']).toBe('NGN');
    expect(String(body['reference'])).toMatch(/^PAYOUT-/);
  });

  it('decodes the PROCESSING result and posts correctly', async () => {
    const fetch = capturingFetch(200, okBody({
      payoutReference: 'PYT-99',
      status: 'PROCESSING',
      message: 'accepted',
    }));
    const out = await makeClient(fetch).payouts.initiate({ ...valid, reference: 'REF-001' });
    expect(out.payoutReference).toBe('PYT-99');
    expect(out.status).toBe('PROCESSING');
    expect(fetch.calls[0]!.method).toBe('POST');
    expect(fetch.calls[0]!.url.pathname).toMatch(/\/payment-payout\/initiate$/);
    expect(fetch.calls[0]!.body).toMatchObject({ amount: 5000, reference: 'REF-001' });
  });
});
