import type { WayaPay } from '../client.js';
import { requireFields } from '../util.js';
import type { CollectInput, CollectResult } from '../types.js';

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
}
