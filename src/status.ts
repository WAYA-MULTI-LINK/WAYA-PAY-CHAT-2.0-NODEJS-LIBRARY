/**
 * Status-interpretation helpers. The status APIs and webhooks return raw status
 * strings; these functions map them to an outcome (what to do) plus a terminal
 * flag (whether the status can still change). Mirrors the .NET status extensions.
 */

/** How a collection (deposit) status should be acted on. */
export type CollectionOutcome = 'in_flight' | 'succeeded' | 'refunded' | 'not_debited' | 'indeterminate';

/** How a payout (disbursement) status should be acted on. */
export type PayoutOutcome = 'reconciling' | 'succeeded' | 'reversed';

/** How a webhook status should be acted on. */
export type WebhookStatusOutcome = 'successful' | 'partial' | 'failed' | 'unknown';

function normalize(status: string | null | undefined): string {
  return (status ?? '').trim().toUpperCase();
}

/**
 * Map a raw collection status to the action a merchant should take.
 * Unrecognised values map to `indeterminate` — reconcile rather than guess.
 *
 * - INITIATED / PENDING / PROCESSING / APPROVED / PARTIAL -> `in_flight`
 * - SUCCESSFUL -> `succeeded`
 * - REFUNDED -> `refunded`
 * - FAILED / DECLINED / REJECTED / ABANDONED / EXPIRED / CANCELLED / CUSTOMER_ERROR / FRAUD_ERROR -> `not_debited`
 * - TIMEOUT / ERROR / SYSTEM_ERROR / BANK_ERROR / unknown -> `indeterminate`
 */
export function collectionOutcome(status: string): CollectionOutcome {
  switch (normalize(status)) {
    case 'INITIATED':
    case 'PENDING':
    case 'PROCESSING':
    case 'APPROVED':
    case 'PARTIAL':
      return 'in_flight';
    case 'SUCCESSFUL':
      return 'succeeded';
    case 'REFUNDED':
      return 'refunded';
    case 'FAILED':
    case 'DECLINED':
    case 'REJECTED':
    case 'ABANDONED':
    case 'EXPIRED':
    case 'CANCELLED':
    case 'CUSTOMER_ERROR':
    case 'FRAUD_ERROR':
      return 'not_debited';
    // TIMEOUT / ERROR / SYSTEM_ERROR / BANK_ERROR / unknown
    default:
      return 'indeterminate';
  }
}

/**
 * True once a collection status will no longer change. In-flight statuses and
 * unrecognised values are non-terminal and should be polled.
 */
export function isCollectionTerminal(status: string): boolean {
  switch (normalize(status)) {
    case 'INITIATED':
    case 'PENDING':
    case 'PROCESSING':
    case 'APPROVED':
    case 'PARTIAL':
      return false;
    case 'SUCCESSFUL':
    case 'REFUNDED':
    case 'FAILED':
    case 'DECLINED':
    case 'REJECTED':
    case 'ABANDONED':
    case 'EXPIRED':
    case 'CANCELLED':
    case 'CUSTOMER_ERROR':
    case 'FRAUD_ERROR':
    case 'TIMEOUT':
    case 'ERROR':
    case 'SYSTEM_ERROR':
    case 'BANK_ERROR':
      return true;
    // unrecognised -> non-terminal, reconcile
    default:
      return false;
  }
}

/**
 * Map a raw payout status to the action a merchant should take.
 * Unrecognised values map to `reconciling` — reconcile rather than guess.
 *
 * - PENDING -> `reconciling`
 * - SUCCESS -> `succeeded`
 * - REVERSED -> `reversed`
 */
export function payoutOutcome(status: string): PayoutOutcome {
  switch (normalize(status)) {
    case 'SUCCESS':
      return 'succeeded';
    case 'REVERSED':
      return 'reversed';
    // PENDING / unknown
    default:
      return 'reconciling';
  }
}

/** True once a payout status will no longer change. PENDING and unknown are non-terminal. */
export function isPayoutTerminal(status: string): boolean {
  switch (normalize(status)) {
    case 'SUCCESS':
    case 'REVERSED':
      return true;
    // PENDING / unknown
    default:
      return false;
  }
}

/**
 * Map a raw webhook status to an outcome.
 *
 * - SUCCESSFUL -> `successful`
 * - PARTIAL -> `partial`
 * - FAILED -> `failed`
 * - unrecognised -> `unknown`
 */
export function webhookStatus(status: string): WebhookStatusOutcome {
  switch (normalize(status)) {
    case 'SUCCESSFUL':
      return 'successful';
    case 'PARTIAL':
      return 'partial';
    case 'FAILED':
      return 'failed';
    default:
      return 'unknown';
  }
}
