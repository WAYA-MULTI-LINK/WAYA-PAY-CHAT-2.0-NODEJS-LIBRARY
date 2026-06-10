import { describe, expect, it } from 'vitest';
import { WayaPayError, payoutOutcome, isPayoutTerminal } from '../src/index.js';
import { capturingFetch, makeClient, okBody, stubFetch } from './helpers.js';

describe('payouts.getStatus', () => {
  it('requires a reference', async () => {
    const c = makeClient(stubFetch(200, okBody({})));
    await expect(c.payouts.getStatus('')).rejects.toBeInstanceOf(WayaPayError);
  });

  it('sends a GET to the status path with the reference URL-encoded', async () => {
    const fetch = capturingFetch(200, okBody({ transactionReference: 'PAYOUT/1', status: 'PENDING' }));
    await makeClient(fetch).payouts.getStatus('PAYOUT/1');
    const call = fetch.calls[0]!;
    expect(call.method).toBe('GET');
    expect(call.url.pathname).toBe('/merchant-middleware/api/v2/payment-payout/status/PAYOUT%2F1');
  });

  it('decodes a SUCCESS status body', async () => {
    const fetch = capturingFetch(200, okBody({
      transactionReference: 'PAYOUT-20260604-001',
      status: 'SUCCESS',
      amount: '500.00',
      destinationAccountName: 'JOHN DOE',
    }));
    const out = await makeClient(fetch).payouts.getStatus('PAYOUT-20260604-001');
    expect(out.transactionReference).toBe('PAYOUT-20260604-001');
    expect(out.status).toBe('SUCCESS');
    expect(out.destinationAccountName).toBe('JOHN DOE');
    expect(payoutOutcome(out.status)).toBe('succeeded');
    expect(isPayoutTerminal(out.status)).toBe(true);
  });
});

describe('payoutOutcome / isPayoutTerminal mapping', () => {
  const cases: Array<[string, ReturnType<typeof payoutOutcome>, boolean]> = [
    ['PENDING', 'reconciling', false],
    ['SUCCESS', 'succeeded', true],
    ['REVERSED', 'reversed', true],
    ['WHATEVER', 'reconciling', false],
  ];

  it.each(cases)('%s -> %s, terminal=%s', (raw, outcome, terminal) => {
    expect(payoutOutcome(raw)).toBe(outcome);
    expect(isPayoutTerminal(raw)).toBe(terminal);
  });

  it('normalizes case and whitespace', () => {
    expect(payoutOutcome('  success ')).toBe('succeeded');
    expect(isPayoutTerminal(' pending ')).toBe(false);
  });
});
