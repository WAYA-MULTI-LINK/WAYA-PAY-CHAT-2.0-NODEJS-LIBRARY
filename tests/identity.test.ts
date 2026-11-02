import { describe, expect, it } from 'vitest';
import { capturingFetch, makeClient, okBody } from './helpers.js';

import { describe, expect, it } from 'vitest';
import { capturingFetch, makeClient, okBody } from './helpers.js';

describe('identity.initiateBvn', () => {
  it.each(['', '123', '2250080903X', '225008090377'])(
    'rejects an invalid BVN %j before any network call',
    async (bad) => {
      const fetch = capturingFetch(200, okBody({}));
      await expect(makeClient(fetch).identity.initiateBvn(bad)).rejects.toMatchObject({
        type: 'validation',
      });
      expect(fetch.calls.length).toBe(0);
    },
  );

  it('accepts a string or an object', async () => {
    const fetch = capturingFetch(
      200,
      okBody({ reference: 'ref-123', phoneNumber: '234****0000', expiresAt: '2026-10-13T14:32:10.482' }),
    );
    const c = makeClient(fetch);
    expect((await c.identity.initiateBvn('22222222222')).reference).toBe('ref-123');
    expect((await c.identity.initiateBvn({ bvn: '22222222222' })).reference).toBe('ref-123');
    expect((await c.initiateBvn('22222222222')).reference).toBe('ref-123');
  });

  it('posts to the correct path with the bvn body', async () => {
    const fetch = capturingFetch(
      200,
      okBody({ reference: 'ref-123', phoneNumber: '234****0000', expiresAt: '2026-10-13T14:32:10.482' }),
    );
    await makeClient(fetch).identity.initiateBvn('22222222222');
    expect(fetch.calls[0]!.url.pathname).toMatch(/\/identity-verification\/bvn\/initiate$/);
    expect(fetch.calls[0]!.body).toEqual({ bvn: '22222222222' });
  });
});

describe('identity.completeBvn', () => {
  it('requires reference and otp', async () => {
    const fetch = capturingFetch(200, okBody({}));
    const c = makeClient(fetch);
    await expect(c.identity.completeBvn('', '123456')).rejects.toMatchObject({
      type: 'validation',
    });
    await expect(c.identity.completeBvn('ref-123', '')).rejects.toMatchObject({
      type: 'validation',
    });
    expect(fetch.calls.length).toBe(0);
  });

  it('accepts positional arguments or an object', async () => {
    const fetch = capturingFetch(
      200,
      okBody({ bvn: '22222222222', firstName: 'TEST', lastName: 'USER', watchListed: 'SANDBOX' }),
    );
    const c = makeClient(fetch);
    const res1 = await c.identity.completeBvn('ref-123', '123456');
    expect(res1.firstName).toBe('TEST');
    expect(res1.watchListed).toBe('SANDBOX');

    const res2 = await c.identity.completeBvn({ reference: 'ref-123', otp: '123456' });
    expect(res2.lastName).toBe('USER');

    const res3 = await c.completeBvn('ref-123', '123456');
    expect(res3.firstName).toBe('TEST');
  });

  it('posts to /identity-verification/bvn/complete with reference and otp', async () => {
    const fetch = capturingFetch(
      200,
      okBody({ bvn: '22222222222', firstName: 'TEST', lastName: 'USER' }),
    );
    await makeClient(fetch).identity.completeBvn('ref-123', '123456');
    expect(fetch.calls[0]!.url.pathname).toMatch(/\/identity-verification\/bvn\/complete$/);
    expect(fetch.calls[0]!.body).toEqual({ reference: 'ref-123', otp: '123456' });
  });
});

describe('identity.verifyBvn (deprecated)', () => {
  it('posts to the legacy path with the bvn body', async () => {
    const fetch = capturingFetch(200, okBody({ bvn: '22500809037' }));
    await makeClient(fetch).identity.verifyBvn('22500809037');
    expect(fetch.calls[0]!.url.pathname).toMatch(/\/identity-verification\/bvn$/);
    expect(fetch.calls[0]!.body).toEqual({ bvn: '22500809037' });
  });
});
