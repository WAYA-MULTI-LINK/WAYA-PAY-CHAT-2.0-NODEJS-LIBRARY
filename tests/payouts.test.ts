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

describe('payouts.listBanks', () => {
  it('returns the decoded banks', async () => {
    const c = makeClient(stubFetch(200, okBody([
      { code: '044', name: 'Access Bank', id: '044', status: true },
      { code: '058', name: 'GTBank', id: '058', status: true },
    ])));
    const banks = await c.payouts.listBanks();
    expect(banks).toHaveLength(2);
    expect(banks[0]!.code).toBe('044');
    expect(banks[0]!.name).toBe('Access Bank');
  });

  it('hits the correct endpoint with GET', async () => {
    const fetch = capturingFetch(200, okBody([]));
    await makeClient(fetch).payouts.listBanks();
    expect(fetch.calls[0]!.method).toBe('GET');
    expect(fetch.calls[0]!.url.pathname).toMatch(/\/get-bank-list$/);
  });

  it('returns an empty array when data is null', async () => {
    const c = makeClient(stubFetch(200, okBody(null)));
    await expect(c.payouts.listBanks()).resolves.toEqual([]);
  });
});

describe('payouts.verifyAccount', () => {
  it('requires bankCode for OTHERS', async () => {
    const c = makeClient(stubFetch(200, okBody({})));
    await expect(c.payouts.verifyAccount({ accountNumber: '0123456789', enquiryType: 'OTHERS' }))
      .rejects.toMatchObject({ type: 'validation', message: /bankCode/ });
  });

  it('allows WAYABANK without a bankCode', async () => {
    const fetch = capturingFetch(200, okBody({ accountName: 'JOHN DOE' }));
    const out = await makeClient(fetch).payouts.verifyAccount({
      accountNumber: '0123456789',
      enquiryType: 'WAYABANK',
    });
    expect(out.accountName).toBe('JOHN DOE');
    expect(fetch.calls.length).toBe(1);
  });

  it('decodes the resolved account and posts correctly', async () => {
    const fetch = capturingFetch(200, okBody({
      successful: true,
      accountName: 'JOHN DOE',
      bankName: 'Access Bank',
      bankCode: '044',
    }));
    const out = await makeClient(fetch).payouts.verifyAccount({
      accountNumber: '0123456789',
      bankCode: '044',
    });
    expect(out.accountName).toBe('JOHN DOE');
    expect(fetch.calls[0]!.method).toBe('POST');
    expect(fetch.calls[0]!.url.pathname).toMatch(/\/verify-account$/);
    expect(fetch.calls[0]!.body).toMatchObject({ accountNumber: '0123456789', bankCode: '044' });
  });
});

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
