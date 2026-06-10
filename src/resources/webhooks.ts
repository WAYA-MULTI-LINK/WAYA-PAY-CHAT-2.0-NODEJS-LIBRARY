import { WayaPayError } from '../errors.js';
import {
  constructEvent as constructEventFn,
  verifySignature as verifySignatureFn,
  type ConstructEventOptions,
} from '../webhook.js';
import type { WebhookEvent } from '../types.js';

/**
 * Verifies and parses incoming transaction webhooks. A thin, discoverable wrapper
 * over the standalone `constructEvent` / `verifySignature` helpers — the forms
 * without a `secret` argument use the configured `webhookSecret`; the ones with it
 * let you route per environment (TEST vs PRODUCTION).
 */
export class Webhooks {
  constructor(private readonly secret?: string) {}

  /**
   * Verify the signature and replay window, then parse the body. Uses the
   * configured `webhookSecret`, or an explicit `secret` if you pass one. Throws
   * `WayaPayWebhookError` if verification fails.
   */
  constructEvent(
    payload: string,
    timestamp: string | null | undefined,
    signature: string | null | undefined,
    options?: ConstructEventOptions,
  ): WebhookEvent;
  constructEvent(
    payload: string,
    timestamp: string | null | undefined,
    signature: string | null | undefined,
    secret: string,
    options?: ConstructEventOptions,
  ): WebhookEvent;
  constructEvent(
    payload: string,
    timestamp: string | null | undefined,
    signature: string | null | undefined,
    secretOrOptions?: string | ConstructEventOptions,
    options?: ConstructEventOptions,
  ): WebhookEvent {
    if (typeof secretOrOptions === 'string') {
      return constructEventFn(payload, timestamp, signature, secretOrOptions, options);
    }
    return constructEventFn(payload, timestamp, signature, this.requireSecret(), secretOrOptions);
  }

  /**
   * Signature-only check (no replay window). Uses the configured `webhookSecret`,
   * or an explicit `secret` if you pass one. Returns false on missing/malformed
   * input; never throws (except when no secret is available at all).
   */
  verifySignature(
    payload: string,
    timestamp: string | null | undefined,
    signature: string | null | undefined,
    secret?: string,
  ): boolean {
    return verifySignatureFn(payload, timestamp, signature, secret ?? this.requireSecret());
  }

  private requireSecret(): string {
    if (!this.secret) {
      throw new WayaPayError(
        'No webhookSecret configured. Set webhookSecret in WayaPayOptions, or call the overload that takes an explicit secret.',
        { type: 'config' },
      );
    }
    return this.secret;
  }
}
