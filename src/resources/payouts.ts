import type { WayaPay } from '../client.js';
import { generateReference, requireFields } from '../util.js';
import type { PayoutInput, PayoutResult, PayoutStatusResult } from '../types.js';

export class Payouts {
  constructor(private readonly client: WayaPay) {}

  /**
   * Initiate a bank transfer. Defaults `currency` to `NGN` and auto-generates a
   * `reference` when omitted. A `PROCESSING` status means accepted, not settled —
   * verify with the reference afterwards. This is a write: it never auto-retries.
   *
   * `POST /payment-payout/initiate`
   */
  async initiate(input: PayoutInput): Promise<PayoutResult> {
    const body: Record<string, unknown> = { currency: 'NGN', ...input };
    if (!body['reference']) body['reference'] = generateReference('PAYOUT');
    requireFields(
      body,
      ['amount', 'currency', 'accountNumber', 'bankCode', 'accountName', 'reference', 'narration'],
      'payout',
    );
    return this.client.request<PayoutResult>('POST', '/payment-payout/initiate', { body });
  }

  /**
   * Get the latest status of a payout by the `reference` you sent at initiation.
   * Scoped to the authenticated merchant — a reference belonging to another
   * merchant (or a different environment) returns 404. Interpret the returned
   * `status` with `payoutOutcome` / `isPayoutTerminal`.
   *
   * `GET /payment-payout/status/{reference}`
   */
  async getStatus(reference: string): Promise<PayoutStatusResult> {
    requireFields({ reference }, ['reference'], 'payout status');
    const path = `/payment-payout/status/${encodeURIComponent(reference)}`;
    return this.client.request<PayoutStatusResult>('GET', path);
  }
}
