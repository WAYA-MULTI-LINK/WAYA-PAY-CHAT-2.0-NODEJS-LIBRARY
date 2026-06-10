import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  constructEvent,
  verifySignature,
  WayaPayWebhookError,
  WayaPayError,
  webhookStatus,
  shouldFulfil,
  WayaPay,
} from '../src/index.js';
import { stubFetch, okBody } from './helpers.js';

const SECRET = 'WAYASECK_TEST_webhook_secret';

const BODY = JSON.stringify({
  OrderId: '1779662251460508970',
  Amount: 1500.0,
  Description: 'Order #4523',
  Fee: 15.0,
  Currency: 'NGN',
  Status: 'SUCCESSFUL',
  TranTime: '2026-06-07T14:30:12',
  TransactionDate: '2026-06-07 14:30:12',
  productName: 'CARD',
  businessName: 'Your Shop Ltd',
  customer: { name: 'John Doe', email: 'john@example.com', phoneNumber: '08012345678', customerId: 'CUS_abc' },
  merchantId: 'MER_xyz',
  recurrentPayment: false,
});

function sign(timestamp: string, body: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('base64');
}

const nowMs = (): string => Date.now().toString();

describe('constructEvent', () => {
  it('parses mixed casing + nested customer on a valid signature', () => {
    const ts = nowMs();
    const evt = constructEvent(BODY, ts, sign(ts, BODY), SECRET);

    // PascalCase wire fields
    expect(evt.orderId).toBe('1779662251460508970');
    expect(evt.amount).toBe(1500.0);
    expect(evt.fee).toBe(15.0);
    expect(evt.status).toBe('SUCCESSFUL');
    // camelCase wire fields
    expect(evt.productName).toBe('CARD');
    expect(evt.merchantId).toBe('MER_xyz');
    expect(evt.recurrentPayment).toBe(false);
    // nested customer
    expect(evt.customer).toBeDefined();
    expect(evt.customer!.email).toBe('john@example.com');
    expect(evt.customer!.customerId).toBe('CUS_abc');
    // omitted optional field -> undefined
    expect(evt.branchCategory).toBeUndefined();

    expect(webhookStatus(evt.status)).toBe('successful');
    expect(shouldFulfil(evt)).toBe(true);
  });

  it('throws on a wrong secret', () => {
    const ts = nowMs();
    const sig = sign(ts, BODY, 'the-wrong-secret');
    expect(() => constructEvent(BODY, ts, sig, SECRET)).toThrow(WayaPayWebhookError);
    expect(() => constructEvent(BODY, ts, sig, SECRET)).toThrow(/signature/i);
  });

  it('throws when the body is tampered after signing', () => {
    const ts = nowMs();
    const sig = sign(ts, BODY);
    const tampered = BODY.replace('1500', '9999');
    expect(() => constructEvent(tampered, ts, sig, SECRET)).toThrow(WayaPayWebhookError);
  });

  it('throws on a stale timestamp (mentions tolerance)', () => {
    const staleTs = (Date.now() - 10 * 60 * 1000).toString();
    const sig = sign(staleTs, BODY);
    expect(() => constructEvent(BODY, staleTs, sig, SECRET)).toThrow(/tolerance/i);
  });

  it('accepts a stale timestamp when the replay check is disabled', () => {
    const staleTs = (Date.now() - 10 * 60 * 1000).toString();
    const sig = sign(staleTs, BODY);
    const evt = constructEvent(BODY, staleTs, sig, SECRET, { toleranceMs: Infinity });
    expect(evt.orderId).toBe('1779662251460508970');
  });

  it('throws on invalid JSON with a valid signature', () => {
    const notJson = 'this is not json';
    const ts = nowMs();
    const sig = sign(ts, notJson);
    expect(() => constructEvent(notJson, ts, sig, SECRET)).toThrow(WayaPayWebhookError);
  });
});

describe('verifySignature', () => {
  it('returns true on a match', () => {
    const ts = nowMs();
    expect(verifySignature(BODY, ts, sign(ts, BODY), SECRET)).toBe(true);
  });

  it.each([null, undefined, '', 'not-base64-!!!'])(
    'returns false on missing/malformed signature: %s',
    (sig) => {
      expect(verifySignature(BODY, nowMs(), sig as string | null | undefined, SECRET)).toBe(false);
    },
  );

  it('returns false on a wrong secret', () => {
    const ts = nowMs();
    expect(verifySignature(BODY, ts, sign(ts, BODY, 'wrong'), SECRET)).toBe(false);
  });
});

describe('webhookStatus mapping', () => {
  const cases: Array<[string, ReturnType<typeof webhookStatus>]> = [
    ['SUCCESSFUL', 'successful'],
    ['PARTIAL', 'partial'],
    ['FAILED', 'failed'],
    ['WHATEVER', 'unknown'],
  ];
  it.each(cases)('%s -> %s', (raw, expected) => {
    expect(webhookStatus(raw)).toBe(expected);
  });
});

describe('client.webhooks', () => {
  const SMALL_BODY = JSON.stringify({
    OrderId: '1779662251460508970',
    Amount: 1500.0,
    Status: 'SUCCESSFUL',
    productName: 'CARD',
    merchantId: 'MER_xyz',
    recurrentPayment: false,
  });

  function clientWith(webhookSecret?: string): WayaPay {
    return new WayaPay({
      merchantId: 'MER_TEST',
      secretKey: 'WAYASECK_TEST_key',
      fetch: stubFetch(200, okBody({})),
      webhookSecret,
    });
  }

  it('uses the configured secret', () => {
    const client = clientWith(SECRET);
    const ts = nowMs();
    const evt = client.webhooks.constructEvent(SMALL_BODY, ts, sign(ts, SMALL_BODY));
    expect(evt.orderId).toBe('1779662251460508970');
    expect(shouldFulfil(evt)).toBe(true);
  });

  it('throws on a wrong configured secret', () => {
    const client = clientWith('a-different-secret');
    const ts = nowMs();
    expect(() => client.webhooks.constructEvent(SMALL_BODY, ts, sign(ts, SMALL_BODY))).toThrow(
      WayaPayWebhookError,
    );
  });

  it('throws a clear error when no secret is configured', () => {
    const client = clientWith(undefined);
    const ts = nowMs();
    expect(() => client.webhooks.constructEvent(SMALL_BODY, ts, sign(ts, SMALL_BODY))).toThrow(
      WayaPayError,
    );
    expect(() => client.webhooks.constructEvent(SMALL_BODY, ts, sign(ts, SMALL_BODY))).toThrow(
      /webhookSecret/i,
    );
  });

  it('lets an explicit secret override (no configured secret)', () => {
    const client = clientWith(undefined);
    const ts = nowMs();
    const evt = client.webhooks.constructEvent(SMALL_BODY, ts, sign(ts, SMALL_BODY), SECRET);
    expect(evt.orderId).toBe('1779662251460508970');
  });

  it('verifySignature uses the configured secret', () => {
    const client = clientWith(SECRET);
    const ts = nowMs();
    expect(client.webhooks.verifySignature(SMALL_BODY, ts, sign(ts, SMALL_BODY))).toBe(true);
    expect(client.webhooks.verifySignature(SMALL_BODY, ts, sign(ts, SMALL_BODY, 'wrong'))).toBe(false);
  });
});
