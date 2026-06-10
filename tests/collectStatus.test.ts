import { describe, expect, it } from 'vitest';
import { WayaPayError, collectionOutcome, isCollectionTerminal } from '../src/index.js';
import { capturingFetch, makeClient, okBody, stubFetch } from './helpers.js';

describe('collect.getStatus', () => {
  it('requires a refNo', async () => {
    const c = makeClient(stubFetch(200, okBody({})));
    await expect(c.collect.getStatus('')).rejects.toBeInstanceOf(WayaPayError);
  });

  it('sends a GET to the status path with the refNo URL-encoded', async () => {
    const fetch = capturingFetch(200, okBody({ refNo: 'ABC/123', status: 'PENDING' }));
    await makeClient(fetch).collect.getStatus('ABC/123');
    const call = fetch.calls[0]!;
    expect(call.method).toBe('GET');
    expect(call.url.pathname).toBe('/merchant-middleware/api/v2/payment-collect/status/ABC%2F123');
  });

  it('decodes a SUCCESSFUL status body', async () => {
    const fetch = capturingFetch(200, okBody({
      refNo: '1779662251460508970',
      tranId: 'guid-1',
      status: 'SUCCESSFUL',
      amountPaid: '1500.00',
      currencyCode: 'NGN',
    }));
    const out = await makeClient(fetch).collect.getStatus('1779662251460508970');
    expect(out.refNo).toBe('1779662251460508970');
    expect(out.status).toBe('SUCCESSFUL');
    expect(out.amountPaid).toBe('1500.00');
    expect(collectionOutcome(out.status)).toBe('succeeded');
    expect(isCollectionTerminal(out.status)).toBe(true);
  });
});

describe('collectionOutcome / isCollectionTerminal mapping', () => {
  const cases: Array<[string, ReturnType<typeof collectionOutcome>, boolean]> = [
    ['PENDING', 'in_flight', false],
    ['PARTIAL', 'in_flight', false],
    ['SUCCESSFUL', 'succeeded', true],
    ['REFUNDED', 'refunded', true],
    ['DECLINED', 'not_debited', true],
    ['BANK_ERROR', 'indeterminate', true],
    ['WHATEVER', 'indeterminate', false],
  ];

  it.each(cases)('%s -> %s, terminal=%s', (raw, outcome, terminal) => {
    expect(collectionOutcome(raw)).toBe(outcome);
    expect(isCollectionTerminal(raw)).toBe(terminal);
  });

  it('normalizes case and whitespace', () => {
    expect(collectionOutcome('  successful ')).toBe('succeeded');
    expect(isCollectionTerminal(' pending ')).toBe(false);
  });
});
