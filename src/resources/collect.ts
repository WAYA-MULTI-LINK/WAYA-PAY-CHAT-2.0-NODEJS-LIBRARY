import type { WayaPay } from '../client.js';
import { requireFields } from '../util.js';
import type { CollectInput, CollectResult, CollectStatusResult } from '../types.js';

export class Collect {
  constructor(private readonly client: WayaPay) {}

  /**
   * Create a payment link. Defaults a one-time NGN link. If `linkCanExpire` is
   * true, `expiryDate` is required.
   *
   * This call fails unless you have whitelisted your server IPs and configured
   * payment preferences on the merchant dashboard.
   *
   * `POST /payment-collect/initiate`
   */
  async create(input: CollectInput): Promise<CollectResult> {
    const body: Record<string, unknown> = {
      paymentLinkType: 'ONE_TIME_PAYMENT_LINK',
      currency: 'NGN',
      ...input,
    };
    requireFields(
      body,
      ['paymentLinkType', 'paymentLinkName', 'description', 'payableAmount', 'currency', 'redirectLink'],
      'payment collect',
    );
    if (body['linkCanExpire'] === true) {
      requireFields(body, ['expiryDate'], 'payment collect (expiry)');
    }
    return this.client.request<CollectResult>('POST', '/payment-collect/initiate', { body });
  }

  /**
   * Get the current state of a deposit by its `refNo` (the gateway
   * transactionId / webhook orderId). Use for reconciliation alongside the
   * deposit webhook — the webhook is the primary signal; this is the pull /
   * safety-net path. Interpret the returned `status` with `collectionOutcome` /
   * `isCollectionTerminal`.
   *
   * `GET /payment-collect/status/{refNo}`
   */
  async getStatus(refNo: string): Promise<CollectStatusResult> {
    requireFields({ refNo }, ['refNo'], 'collect status');
    const path = `/payment-collect/status/${encodeURIComponent(refNo)}`;
    return this.client.request<CollectStatusResult>('GET', path);
  }
}
