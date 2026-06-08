/**
 * Live integration tests. These hit the real WayaPay API and are excluded from
 * the default run (see vitest.config.ts). Enable them with real credentials:
 *
 *   WAYA_LIVE=1 WAYA_MERCHANT_ID=MER_... WAYA_SECRET_KEY=WAYASECK_TEST_... \
 *     npm run test:live
 *
 * They default to staging; set WAYA_ENV=production to target live.
 */
import { describe, expect, it } from 'vitest';
import { WayaPay } from '../src/index.js';

const merchantId = process.env.WAYA_MERCHANT_ID;
const secretKey = process.env.WAYA_SECRET_KEY;

function client(): WayaPay {
  return new WayaPay({
    merchantId: merchantId!,
    secretKey: secretKey!,
    environment: process.env.WAYA_ENV === 'production' ? 'production' : 'staging',
  });
}

describe.skipIf(!merchantId || !secretKey)('live', () => {
  it('lists banks', async () => {
    const banks = await client().banks.list();
    expect(banks.length).toBeGreaterThan(0);
    expect(banks[0]).toHaveProperty('code');
  });

  it('verifies an account', async () => {
    const out = await client().accounts.verify({
      accountNumber: process.env.WAYA_TEST_ACCOUNT ?? '0123456789',
      bankCode: process.env.WAYA_TEST_BANK_CODE ?? '044',
    });
    expect(out).toHaveProperty('accountName');
  });
});
