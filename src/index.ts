export { WayaPay, WayaPay as default } from './client.js';
export { WayaPayError } from './errors.js';
export { generateReference } from './util.js';

export { Identity } from './resources/identity.js';
export { Payouts } from './resources/payouts.js';
export { Collect } from './resources/collect.js';
export { Webhooks } from './resources/webhooks.js';

export {
  constructEvent,
  verifySignature,
  WayaPayWebhookError,
  TIMESTAMP_HEADER,
  SIGNATURE_HEADER,
  DEFAULT_TOLERANCE_MS,
} from './webhook.js';
export type { ConstructEventOptions } from './webhook.js';

export {
  collectionOutcome,
  isCollectionTerminal,
  payoutOutcome,
  isPayoutTerminal,
  webhookStatus,
} from './status.js';
export type {
  CollectionOutcome,
  PayoutOutcome,
  WebhookStatusOutcome,
} from './status.js';

export { shouldFulfil } from './webhook.js';

export type { WayaPayErrorType, WayaPayErrorOptions } from './errors.js';
export type {
  FetchLike,
  RequestOptions,
  WayaPayOptions,
  Bank,
  EnquiryType,
  VerifyAccountInput,
  VerifyAccountResult,
  BvnResult,
  PayoutInput,
  PayoutResult,
  CollectInput,
  CollectResult,
  CollectStatusResult,
  PayoutStatusResult,
  WebhookEvent,
  WebhookCustomer,
} from './types.js';
