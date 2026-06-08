import { describe, expect, it } from 'vitest';
import { WayaPayError } from '../src/index.js';
import { capturingFetch, makeClient, okBody, sequenceFetch, stubFetch } from './helpers.js';

describe('transactions.verify', () => {
  it('requires a reference', async () => {
    const c = makeClient(stubFetch(200, okBody({})));
    await expect(c.transactions.verify('')).rejects.toBeInstanceOf(WayaPayError);
  });

  it('sends the reference as a query param and decodes', async () => {
    const fetch = capturingFetch(200, okBody({ status: 'SUCCESS', amount: 5000 }));
    const out = await makeClient(fetch).transactions.verify('PYT-99');
    expect(out.status).toBe('SUCCESS');
    expect(fetch.calls[0]!.method).toBe('GET');
    expect(fetch.calls[0]!.url.pathname).toMatch(/\/transaction\/verify$/);
    expect(fetch.calls[0]!.url.searchParams.get('reference')).toBe('PYT-99');
  });

  it('accepts an object input', async () => {
    const fetch = capturingFetch(200, okBody({ status: 'SUCCESS' }));
    const out = await makeClient(fetch).transactions.verify({ reference: 'PYT-1' });
    expect(out.status).toBe('SUCCESS');
  });
});

describe('transactions.history', () => {
  it('builds the query with defaults', async () => {
    const fetch = capturingFetch(200, okBody({ items: [], totalPages: 0 }));
    await makeClient(fetch).transactions.history({ status: 'SUCCESS', size: 50 });
    const q = fetch.calls[0]!.url.searchParams;
    expect(q.get('size')).toBe('50');
    expect(q.get('status')).toBe('SUCCESS');
    expect(q.get('page')).toBe('0');
  });
});

describe('transactions.historyAll', () => {
  it('streams items across pages until totalPages', async () => {
    const fetch = sequenceFetch([
      [200, okBody({ items: [{ transactionReference: '1' }], totalPages: 2 })],
      [200, okBody({ items: [{ transactionReference: '2' }], totalPages: 2 })],
    ]);
    const refs: string[] = [];
    for await (const txn of makeClient(fetch).transactions.historyAll({ status: 'SUCCESS' })) {
      refs.push(txn.transactionReference);
    }
    expect(refs).toEqual(['1', '2']);
    expect(fetch.calls).toBe(2);
  });
});
