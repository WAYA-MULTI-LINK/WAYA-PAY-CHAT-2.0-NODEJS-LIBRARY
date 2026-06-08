export { WayaPay, WayaPay as default } from './client.js';
export { WayaPayError } from './errors.js';
export { generateReference } from './util.js';

export { Banks } from './resources/banks.js';
export { Accounts } from './resources/accounts.js';
export { Identity } from './resources/identity.js';
export { Payouts } from './resources/payouts.js';
export { Collect } from './resources/collect.js';
export { Transactions } from './resources/transactions.js';

export type { WayaPayErrorType, WayaPayErrorOptions } from './errors.js';
export type {
  FetchLike,
  RequestOptions,
  WayaPayOptions,
  Bank,
  EnquiryType,
  VerifyAccountInput,
  VerifyAccountResult,
  CreateDynamicAccountInput,
  DynamicAccount,
  BvnResult,
  PayoutInput,
  PayoutResult,
  CollectInput,
  CollectResult,
  TransactionResult,
  HistoryItem,
  HistoryFilter,
  HistoryResult,
} from './types.js';
