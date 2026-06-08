import { randomUUID } from 'node:crypto';
import { WayaPayError } from './errors.js';

/**
 * Generate a unique reference — your dedup and reconciliation key. Use one per
 * logical operation: retries reuse the same one, new operations get a fresh one.
 *
 * Shape: `<prefix>-<unixMillis>-<HEX>`, e.g. `PAYOUT-1748160000000-A1B2C3D4`.
 */
export function generateReference(prefix = 'WP'): string {
  return `${prefix}-${Date.now()}-${randomUUID().split('-')[0]!.toUpperCase()}`;
}

/**
 * Validate that required fields are present, before any network call. Throws a
 * `WayaPayError` of type `validation` listing every missing field.
 *
 * @internal
 */
export function requireFields(
  payload: Record<string, unknown>,
  fields: readonly string[],
  context: string,
): void {
  const missing = fields.filter((f) => {
    const v = payload[f];
    return v === undefined || v === null || v === '';
  });
  if (missing.length) {
    throw new WayaPayError(`Missing required field(s) for ${context}: ${missing.join(', ')}`, {
      type: 'validation',
    });
  }
}

/**
 * Exponentially growing, jittered delay used between GET retries.
 *
 * @internal
 */
export function backoff(attempt: number): Promise<void> {
  const base = Math.min(1000 * 2 ** (attempt - 1), 4000);
  return new Promise((resolve) => setTimeout(resolve, base + Math.random() * 200));
}
