import { createHmac, timingSafeEqual } from 'node:crypto';
import { webhookStatus } from './status.js';
import type { WebhookEvent, WebhookCustomer } from './types.js';

/**
 * Verifies and parses WayaPay transaction webhooks. Signature verification needs
 * no network call, so these are standalone helpers — pass the raw request body,
 * the signature headers, and the merchant secret for the event's environment.
 *
 * CRITICAL: verify every webhook before acting on it. An unsigned or wrongly
 * signed call is hostile — {@link constructEvent} throws {@link WayaPayWebhookError}
 * rather than returning a value.
 *
 * Capture the EXACT raw request body before any JSON parsing. If your framework
 * deserialises and re-serialises the body, the recomputed HMAC will not match.
 */

/** Header carrying the epoch-millisecond timestamp that is signed alongside the body. */
export const TIMESTAMP_HEADER = 'X-Waya-Timestamp';

/** Header carrying the Base64 HMAC-SHA256 signature. */
export const SIGNATURE_HEADER = 'X-Waya-Signature';

/** Default replay-protection window in milliseconds (5 minutes). */
export const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000;

/** Thrown when a webhook fails signature verification, replay checks, or cannot be parsed. */
export class WayaPayWebhookError extends Error {
  override readonly name = 'WayaPayWebhookError';

  constructor(message: string) {
    super(message);
    // Restore prototype chain for instanceof across transpile targets.
    Object.setPrototypeOf(this, WayaPayWebhookError.prototype);
  }
}

export interface ConstructEventOptions {
  /**
   * Replay window in milliseconds. Defaults to {@link DEFAULT_TOLERANCE_MS}
   * (5 minutes). Pass a negative value (e.g. `Infinity` is treated as enabled;
   * use a negative number such as `-1`, or `Infinity` to disable) — see below.
   * A non-finite/`Infinity` tolerance disables the timestamp check.
   */
  toleranceMs?: number;
}

/**
 * Low-level signature check: returns true when `signature` equals
 * `base64(HMAC-SHA256(key=secret, "{timestamp}.{payload}"))`. Does NOT check the
 * replay window — prefer {@link constructEvent}. Comparison is constant-time.
 * Returns false (never throws) on missing or malformed input.
 */
export function verifySignature(
  payload: string,
  timestamp: string | null | undefined,
  signature: string | null | undefined,
  secret: string,
): boolean {
  if (typeof payload !== 'string') return false;
  if (!timestamp || !signature || !secret) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac('sha256', secret).update(signedPayload, 'utf8').digest();

  let provided: Buffer;
  try {
    provided = Buffer.from(signature, 'base64');
  } catch {
    return false;
  }

  // Guard length before timingSafeEqual; also rejects non-base64 that decodes
  // to a different length. Re-encoding round-trip catches malformed base64.
  if (provided.length !== expected.length) return false;
  if (provided.toString('base64') !== normalizeBase64(signature)) return false;

  return timingSafeEqual(expected, provided);
}

/** Strip whitespace and padding differences so a round-trip comparison is fair. */
function normalizeBase64(s: string): string {
  return Buffer.from(s, 'base64').toString('base64');
}

/**
 * Verifies the signature and replay window, then parses the body into a
 * {@link WebhookEvent}. Throws {@link WayaPayWebhookError} if verification fails —
 * never returns an unverified event.
 *
 * @param payload The exact raw request body, as text.
 * @param timestamp Value of the {@link TIMESTAMP_HEADER} header (epoch milliseconds).
 * @param signature Value of the {@link SIGNATURE_HEADER} header (Base64 HMAC-SHA256).
 * @param secret The merchant secret for this event's environment (TEST or PRODUCTION).
 * @param options Replay window override. A non-finite `toleranceMs` (e.g. `Infinity`)
 *   or a negative value disables the timestamp check (not recommended outside tests).
 */
export function constructEvent(
  payload: string,
  timestamp: string | null | undefined,
  signature: string | null | undefined,
  secret: string,
  options: ConstructEventOptions = {},
): WebhookEvent {
  if (typeof payload !== 'string') {
    throw new WayaPayWebhookError('Webhook payload is required.');
  }
  if (!secret) {
    throw new WayaPayWebhookError('Merchant secret is required.');
  }

  if (!verifySignature(payload, timestamp, signature, secret)) {
    throw new WayaPayWebhookError('Webhook signature verification failed.');
  }

  const toleranceMs = options.toleranceMs ?? DEFAULT_TOLERANCE_MS;
  const replayCheckEnabled = Number.isFinite(toleranceMs) && toleranceMs >= 0;
  if (replayCheckEnabled) {
    const tsMs = Number(timestamp);
    if (!timestamp || !Number.isFinite(tsMs)) {
      throw new WayaPayWebhookError('Webhook timestamp is not a valid epoch-millisecond value.');
    }
    const skew = Math.abs(Date.now() - tsMs);
    if (skew > toleranceMs) {
      throw new WayaPayWebhookError(
        `Webhook timestamp is outside the ${Math.round(toleranceMs / 1000)}s tolerance window (possible replay).`,
      );
    }
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(payload) as Record<string, unknown>;
  } catch {
    throw new WayaPayWebhookError('Webhook body is not valid JSON.');
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new WayaPayWebhookError('Webhook body is not a JSON object.');
  }

  return parseEvent(raw);
}

/** Read a field tolerantly across PascalCase / camelCase wire shapes. */
function pick(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    const v = raw[k];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function asString(v: unknown): string | undefined {
  return v === undefined || v === null ? undefined : String(v);
}

function asNumber(v: unknown): number {
  if (v === undefined || v === null || v === '') return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function parseCustomer(raw: unknown): WebhookCustomer | undefined {
  if (raw === null || typeof raw !== 'object') return undefined;
  const c = raw as Record<string, unknown>;
  const customer: WebhookCustomer = {
    name: asString(pick(c, 'name', 'Name')),
    email: asString(pick(c, 'email', 'Email')),
    phoneNumber: asString(pick(c, 'phoneNumber', 'PhoneNumber')),
    customerId: asString(pick(c, 'customerId', 'CustomerId')),
  };
  return customer;
}

/** Normalize a raw parsed body (mixed PascalCase / camelCase) into a WebhookEvent. */
function parseEvent(raw: Record<string, unknown>): WebhookEvent {
  return {
    orderId: asString(pick(raw, 'OrderId', 'orderId')) ?? '',
    amount: asNumber(pick(raw, 'Amount', 'amount')),
    description: asString(pick(raw, 'Description', 'description')),
    fee: asNumber(pick(raw, 'Fee', 'fee')),
    currency: asString(pick(raw, 'Currency', 'currency')),
    status: asString(pick(raw, 'Status', 'status')) ?? '',
    tranTime: asString(pick(raw, 'TranTime', 'tranTime')),
    transactionDate: asString(pick(raw, 'TransactionDate', 'transactionDate')),
    productName: asString(pick(raw, 'productName', 'ProductName')),
    businessName: asString(pick(raw, 'businessName', 'BusinessName')),
    customer: parseCustomer(pick(raw, 'customer', 'Customer')),
    merchantId: asString(pick(raw, 'merchantId', 'MerchantId')),
    branchCategory: asString(pick(raw, 'branchCategory', 'BranchCategory')),
    recurrentPayment: pick(raw, 'recurrentPayment', 'RecurrentPayment') === true,
  };
}

/**
 * True only when the customer paid in full — safe to fulfil the order (after an
 * idempotency check on {@link WebhookEvent.orderId}).
 */
export function shouldFulfil(event: WebhookEvent): boolean {
  return webhookStatus(event.status) === 'successful';
}
