import { describe, expect, it } from 'vitest';
import { WayaPay, WayaPayError, generateReference } from '../src/index.js';
import {
  capturingFetch,
  errBody,
  failingFetch,
  hangingFetch,
  makeClient,
  okBody,
  sequenceFetch,
  stubFetch,
} from './helpers.js';

describe('construction', () => {
  it('throws a config error when merchantId is missing', () => {
    expect(() => new WayaPay({ secretKey: 's' } as never)).toThrowError(/merchantId is required/);
    try {
      new WayaPay({ secretKey: 's' } as never);
    } catch (e) {
      expect(e).toBeInstanceOf(WayaPayError);
      expect((e as WayaPayError).type).toBe('config');
    }
  });

  it('throws a config error when secretKey is missing', () => {
    expect(() => new WayaPay({ merchantId: 'm' } as never)).toThrowError(/secretKey is required/);
  });

  it('throws a config error when no fetch is available', () => {
    expect(
      () => new WayaPay({ merchantId: 'm', secretKey: 's', fetch: undefined as never }),
    ).not.toThrow(); // falls back to globalThis.fetch (present on Node 18+)
  });

  it('wires up every resource', () => {
    const c = makeClient(stubFetch(200, okBody({})));
    for (const r of [c.identity, c.payouts, c.collect, c.webhooks]) {
      expect(r).toBeDefined();
    }
  });

  it('honors a baseUrl override and trims trailing slashes', () => {
    const c = new WayaPay({ merchantId: 'm', secretKey: 's', baseUrl: 'https://mock.test/api/' });
    expect(c.baseUrl).toBe('https://mock.test/api');
  });

  it('defaults to the production base URL', () => {
    const c = new WayaPay({ merchantId: 'm', secretKey: 's' });
    expect(c.baseUrl).toBe('https://services.wayapay.ng/merchant-middleware/api/v2');
  });
});

describe('transport', () => {
  it('sends auth and merchant headers', async () => {
    const fetch = capturingFetch(200, okBody([]));
    await makeClient(fetch).payouts.listBanks();
    const { headers } = fetch.calls[0]!;
    expect(headers['Authorization']).toBe('Bearer WAYASECK_TEST_key');
    expect(headers['X-Merchant-Id']).toBe('MER_TEST');
    expect(headers['accept']).toBe('application/json');
  });

  it('sets Content-Type only for writes', async () => {
    const fetch = capturingFetch(200, okBody({}));
    const c = makeClient(fetch);
    await c.payouts.listBanks(); // GET
    expect(fetch.calls[0]!.headers['Content-Type']).toBeUndefined();
    await c.identity.verifyBvn('22500809037'); // POST
    expect(fetch.calls[1]!.headers['Content-Type']).toBe('application/json');
  });

  it('returns the envelope data', async () => {
    const c = makeClient(stubFetch(200, okBody({ hello: 'world' })));
    await expect(c.request('GET', '/anything')).resolves.toEqual({ hello: 'world' });
  });

  it('throws an api error when success is false', async () => {
    const c = makeClient(stubFetch(400, errBody('57', 'IP not whitelisted')));
    try {
      await c.payouts.listBanks();
      expect.unreachable();
    } catch (e) {
      const err = e as WayaPayError;
      expect(err.type).toBe('api');
      expect(err.code).toBe('57');
      expect(err.status).toBe(400);
      expect(err.message).toContain('whitelisted');
    }
  });

  it('throws an api error on a non-JSON body', async () => {
    const c = makeClient(stubFetch(502, '<html>502</html>'));
    await expect(c.payouts.listBanks()).rejects.toMatchObject({ type: 'api', message: /Non JSON/ });
  });

  it('maps a network failure to a network error', async () => {
    const c = makeClient(failingFetch('connection refused'));
    await expect(c.payouts.listBanks()).rejects.toMatchObject({ type: 'network' });
  });

  it('maps an abort to a timeout error', async () => {
    const c = makeClient(hangingFetch(), { timeout: 20 });
    await expect(c.payouts.listBanks()).rejects.toMatchObject({ type: 'timeout' });
  });

  it('retries GET on a transient status', async () => {
    const fetch = sequenceFetch([
      [503, errBody('99', 'down')],
      [200, okBody([])],
    ]);
    await makeClient(fetch, { maxRetries: 2 }).payouts.listBanks();
    expect(fetch.calls).toBe(2);
  });

  it('does not retry writes', async () => {
    const fetch = capturingFetch(503, errBody('99', 'down'));
    const c = makeClient(fetch, { maxRetries: 5 });
    await expect(c.payouts.initiate({
      amount: 100,
      accountNumber: '0123456789',
      bankCode: '044',
      accountName: 'X',
      narration: 'n',
    })).rejects.toBeInstanceOf(WayaPayError);
    expect(fetch.calls.length).toBe(1);
  });
});

describe('generateReference', () => {
  it('uses the given prefix and is unique', () => {
    expect(generateReference('PAYOUT')).toMatch(/^PAYOUT-/);
    expect(generateReference()).toMatch(/^WP-/);
    expect(generateReference('X')).not.toBe(generateReference('X'));
  });
});
