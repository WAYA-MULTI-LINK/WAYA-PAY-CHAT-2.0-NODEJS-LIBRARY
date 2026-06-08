import { describe, expect, it } from 'vitest';
import { capturingFetch, makeClient, okBody } from './helpers.js';

describe('identity.verifyBvn', () => {
  it.each(['', '123', '2250080903X', '225008090377'])(
    'rejects an invalid BVN %j before any network call',
    async (bad) => {
      const fetch = capturingFetch(200, okBody({}));
      await expect(makeClient(fetch).identity.verifyBvn(bad)).rejects.toMatchObject({
        type: 'validation',
      });
      expect(fetch.calls.length).toBe(0);
    },
  );

  it('accepts a string or an object', async () => {
    const fetch = capturingFetch(200, okBody({ bvn: '22500809037', firstName: 'JOHN' }));
    const c = makeClient(fetch);
    expect((await c.identity.verifyBvn('22500809037')).firstName).toBe('JOHN');
    expect((await c.identity.verifyBvn({ bvn: '22500809037' })).firstName).toBe('JOHN');
  });

  it('posts to the correct path with the bvn body', async () => {
    const fetch = capturingFetch(200, okBody({ bvn: '22500809037' }));
    await makeClient(fetch).identity.verifyBvn('22500809037');
    expect(fetch.calls[0]!.url.pathname).toMatch(/\/identity-verification\/bvn$/);
    expect(fetch.calls[0]!.body).toEqual({ bvn: '22500809037' });
  });
});
