import type { WayaPay } from '../client.js';
import { requireFields } from '../util.js';
import type { CollectInput, CollectResult, CollectStatusResult } from '../types.js';

export class Collect {
  constructor(private readonly client: WayaPay) {}

  /**
   * Start a payment collection and return a checkout URL to redirect the customer to.
   *
   * `POST /payment-collect/initiate`
   */
  async create(input: CollectInput): Promise<CollectResult> {
    const body: Record<string, unknown> = {
      currency: 'NGN',
      ...input,
    };
    requireFields(
      body,
      ['transactionId', 'amount', 'currency', 'firstName', 'lastName', 'email', 'phone'],
      'payment collect',
    );
    return this.client.request<CollectResult>('POST', '/payment-collect/initiate', { body });
  }

  /**
   * Alias for `create` to match documentation usage `initiatePayment`.
   */
  async initiate(input: CollectInput): Promise<CollectResult> {
    return this.create(input);
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
