import type { WayaPay } from '../client.js';
import { WayaPayError } from '../errors.js';
import { requireFields } from '../util.js';
import type {
  BvnCompleteInput,
  BvnInitiateInput,
  BvnInitiateResult,
  BvnResult,
} from '../types.js';

export class Identity {
  constructor(private readonly client: WayaPay) {}

  /**
   * Step 1 of BVN verification: Submit the customer's BVN to dispatch an OTP
   * to the phone number registered against it.
   *
   * Accepts a string or `{ bvn }`. Validated locally as exactly 11 digits before the call.
   *
   * `POST /identity-verification/bvn/initiate`
   */
  async initiateBvn(input: string | BvnInitiateInput): Promise<BvnInitiateResult> {
    const bvn = typeof input === 'string' ? input : input?.bvn;
    if (!/^\d{11}$/.test(String(bvn ?? ''))) {
      throw new WayaPayError('bvn must be an 11 digit string', { type: 'validation' });
    }
    return this.client.request<BvnInitiateResult>('POST', '/identity-verification/bvn/initiate', {
      body: { bvn },
    });
  }

  /**
   * Step 2 of BVN verification: Complete verification by submitting the session
   * reference from `initiateBvn` and the received OTP.
   *
   * Accepts `{ reference, otp }` or `(reference, otp)`.
   *
   * `POST /identity-verification/bvn/complete`
   */
  async completeBvn(
    inputOrReference: string | BvnCompleteInput,
    maybeOtp?: string,
  ): Promise<BvnResult> {
    let reference: string;
    let otp: string;

    if (typeof inputOrReference === 'string') {
      reference = inputOrReference;
      otp = maybeOtp ?? '';
    } else {
      reference = inputOrReference?.reference ?? '';
      otp = inputOrReference?.otp ?? '';
    }

    requireFields({ reference, otp }, ['reference', 'otp'], 'BVN complete verification');

    return this.client.request<BvnResult>('POST', '/identity-verification/bvn/complete', {
      body: { reference, otp },
    });
  }

  /**
   * Verify a BVN. Accepts a string or `{ bvn }`. The BVN is validated locally
   * as exactly 11 digits before the network call.
   *
   * @deprecated WayaQuick BVN verification requires a two-step OTP verification flow.
   * Use `initiateBvn` followed by `completeBvn` instead.
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
