import type { WayaPay } from '../client.js';
import { WayaPayError } from '../errors.js';
import type { BvnResult } from '../types.js';

export class Identity {
  constructor(private readonly client: WayaPay) {}

  /**
   * Verify a BVN. Accepts a string or `{ bvn }`. The BVN is validated locally
   * as exactly 11 digits before the network call.
   *
   * BVN data is sensitive personal information. Store, transmit, and log it only
   * as your data-protection obligations allow.
   *
   * `POST /identity-verification/bvn`
   */
  async verifyBvn(input: string | { bvn: string }): Promise<BvnResult> {
    const bvn = typeof input === 'string' ? input : input?.bvn;
    if (!/^\d{11}$/.test(String(bvn ?? ''))) {
      throw new WayaPayError('bvn must be an 11 digit string', { type: 'validation' });
    }
    return this.client.request<BvnResult>('POST', '/identity-verification/bvn', { body: { bvn } });
  }
}
