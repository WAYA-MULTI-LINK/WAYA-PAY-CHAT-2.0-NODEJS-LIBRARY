import { describe, expect, it } from 'vitest';
import { WayaPayError } from '../src/index.js';
import { capturingFetch, makeClient, okBody, stubFetch } from './helpers.js';

describe('accounts.verify', () => {
  it('requires bankCode for OTHERS', async () => {
    const c = makeClient(stubFetch(200, okBody({})));
    await expect(c.accounts.verify({ accountNumber: '0123456789', enquiryType: 'OTHERS' }))
      .rejects.toMatchObject({ type: 'validation', message: /bankCode/ });
  });

  it('allows WAYABANK without a bankCode', async () => {
    const fetch = capturingFetch(200, okBody({ accountName: 'JOHN DOE' }));
    const out = await makeClient(fetch).accounts.verify({
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
    const out = await makeClient(fetch).accounts.verify({
      accountNumber: '0123456789',
      bankCode: '044',
    });
    expect(out.accountName).toBe('JOHN DOE');
    expect(fetch.calls[0]!.method).toBe('POST');
    expect(fetch.calls[0]!.url.pathname).toMatch(/\/account-enquiry\/verify-account$/);
    expect(fetch.calls[0]!.body).toMatchObject({ accountNumber: '0123456789', bankCode: '044' });
  });
});

describe('accounts.createDynamic', () => {
  it('validates required fields', async () => {
    const c = makeClient(stubFetch(200, okBody({})));
    await expect(c.accounts.createDynamic({ customerId: 'C1' } as never))
      .rejects.toBeInstanceOf(WayaPayError);
  });

  it('defaults mode and auto-generates referenceId', async () => {
    const fetch = capturingFetch(200, okBody({ virtualAccountNumber: '9900112233' }));
    const out = await makeClient(fetch).accounts.createDynamic({
      accountName: 'ACME LTD',
      customerId: 'CUST-1',
      purpose: 'order',
    });
    expect(out.virtualAccountNumber).toBe('9900112233');
    const body = fetch.calls[0]!.body as Record<string, unknown>;
    expect(body['mode']).toBe('ONE_TIME');
    expect(String(body['referenceId'])).toMatch(/^DYN-/);
  });
});
