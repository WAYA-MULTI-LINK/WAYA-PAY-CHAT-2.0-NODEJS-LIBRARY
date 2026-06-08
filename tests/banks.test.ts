import { describe, expect, it } from 'vitest';
import { capturingFetch, makeClient, okBody, stubFetch } from './helpers.js';

describe('banks.list', () => {
  it('returns the decoded banks', async () => {
    const c = makeClient(stubFetch(200, okBody([
      { code: '044', name: 'Access Bank', id: '044', status: true },
      { code: '058', name: 'GTBank', id: '058', status: true },
    ])));
    const banks = await c.banks.list();
    expect(banks).toHaveLength(2);
    expect(banks[0]!.code).toBe('044');
    expect(banks[0]!.name).toBe('Access Bank');
  });

  it('hits the correct endpoint with GET', async () => {
    const fetch = capturingFetch(200, okBody([]));
    await makeClient(fetch).banks.list();
    expect(fetch.calls[0]!.method).toBe('GET');
    expect(fetch.calls[0]!.url.pathname).toMatch(/\/account-enquiry\/get-bank-list$/);
  });

  it('returns an empty array when data is null', async () => {
    const c = makeClient(stubFetch(200, okBody(null)));
    await expect(c.banks.list()).resolves.toEqual([]);
  });
});
