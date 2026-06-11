/** A fetch implementation compatible with the WHATWG `fetch`. */
export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface WayaPayOptions {
  /** Your MER_... merchant id. */
  merchantId: string;
  /** WAYASECK_TEST_... while testing, WAYASECK_... on live. */
  secretKey: string;
  /** Override the API base URL. Defaults to the production URL. */
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Defaults to 30000. */
  timeout?: number;
  /** Max retries. Applies to GET only. Defaults to 2. */
  maxRetries?: number;
  /** Inject a fetch implementation (DI, tests). Defaults to `globalThis.fetch`. */
  fetch?: FetchLike;
  /**
   * Merchant secret used to verify incoming transaction webhooks. Set this to use
   * `client.webhooks.constructEvent(...)` / `verifySignature(...)` without passing
   * an explicit secret. Use your TEST secret for TEST events, PRODUCTION for live.
   */
  webhookSecret?: string;
}

/** Options accepted by the low-level `request` method. */
export interface RequestOptions {
  body?: unknown;
  query?: Record<string, unknown>;
}

export interface Bank {
  code: string;
  name: string;
  id: string;
  status: boolean;
}

export type EnquiryType = 'OTHERS' | 'WAYABANK';

export interface VerifyAccountInput {
  accountNumber: string;
  bankCode?: string;
  enquiryType?: EnquiryType;
}

export interface VerifyAccountResult {
  successful: boolean;
  responseCode: string;
  responseMessage: string;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  bankName: string;
  enquiryType: EnquiryType;
}

export interface BvnResult {
  bvn: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber1: string;
  registrationDate: string;
  gender: string;
  lgaOfOrigin: string;
  lgaOfResidence: string;
  maritalStatus: string;
  nationality: string;
  residentialAddress: string;
  stateOfOrigin: string;
  watchListed: string;
}

export interface PayoutInput {
  amount: number;
  currency?: string;
  accountNumber: string;
  bankCode: string;
  accountName: string;
  reference?: string;
  narration: string;
}

export interface PayoutResult {
  payoutReference: string;
  merchantReference: string;
  status: string;
  message: string;
}

export interface CollectInput {
  paymentLinkType?: string;
  paymentLinkName: string;
  description: string;
  payableAmount: number;
  currency?: string;
  successMessage?: string;
  phoneNumber?: string;
  redirectLink: string;
  customURL?: string;
  totalCount?: number;
  chargeInterval?: string;
  planId?: string;
  expiryDate?: string;
  linkCanExpire?: boolean;
  otherDetailsJSON?: Record<string, unknown>;
}

export interface CollectResult {
  merchantId: string;
  paymentLinkId: string;
  paymentLinkType: string;
  paymentLinkName: string;
  description: string;
  payableAmount: number;
  currency: string;
  amountText: string;
  successMessage: string;
  redirectLink: string;
  customerPaymentLink: string;
  shortUrl: string;
  status: string;
  deleted: boolean;
  merchantKeyMode: 'TEST' | 'LIVE' | string;
  paymentLinkReference: string;
  expiryDate: string;
  totalCount: number;
  linkCanExpire: boolean;
  isSubscriptionPaymentLink: boolean;
  createdBy: number;
  createdAt: string;
}

/**
 * Status of a single collection (deposit) transaction. Use `refNo` as the
 * idempotency key when fulfilling a SUCCESSFUL payment. Interpret `status` with
 * the `collectionOutcome` / `isCollectionTerminal` helpers.
 */
export interface CollectStatusResult {
  /** Provider reference number. Stable idempotency key for fulfilment. */
  refNo: string;
  /** WayaQuick's internal transaction ID. */
  tranId: string;
  /** Merchant's unique identifier. */
  merchantId?: string;
  /** Amount requested, quoted string, e.g. "1500.00". */
  amount?: string;
  /** Customer email address. */
  customerEmail?: string;
  /** Amount actually paid, quoted string. May be less than `amount` when PARTIAL. */
  amountPaid?: string;
  /** Processing fee, quoted string. */
  fee?: string;
  /** ISO currency code, e.g. "NGN". */
  currencyCode?: string;
  /** Raw transaction status, e.g. "SUCCESSFUL". */
  status: string;
  /** Settlement status, e.g. "PENDING". */
  settlementStatus?: string;
  /** Payment channel, e.g. "CARD". */
  channel?: string;
  /** Processor that handled the transaction, e.g. "ISW". */
  processedBy?: string;
  /** Merchant-supplied description. */
  description?: string;
  /** Environment the transaction ran in, e.g. "LIVE" or "TEST". */
  environment?: string;
  /** Transaction timestamp. */
  tranDate?: string;
}

/**
 * Status of a single payout (disbursement) transaction. Use `transactionReference`
 * as the idempotency key. Interpret `status` with the `payoutOutcome` /
 * `isPayoutTerminal` helpers.
 */
export interface PayoutStatusResult {
  /** Your unique reference. Stable idempotency key. */
  transactionReference: string;
  /** Raw payout status, e.g. "SUCCESS". */
  status: string;
  /** Amount disbursed, quoted string. */
  amount?: string;
  /** Destination NUBAN account number. */
  destinationAccountNumber?: string;
  /** Destination account name. */
  destinationAccountName?: string;
  /** Destination bank name. */
  destinationBankName?: string;
  /** Bank narration / transfer description. */
  narration?: string;
  /** Creation timestamp. */
  createdAt?: string;
}

/** The paying customer embedded in a {@link WebhookEvent}. */
export interface WebhookCustomer {
  name?: string;
  email?: string;
  phoneNumber?: string;
  customerId?: string;
}

/**
 * A transaction webhook delivered by WayaPay when a payment becomes SUCCESSFUL,
 * PARTIAL, or FAILED. Construct one only via `constructEvent`, which verifies the
 * signature first. Use `orderId` as your idempotency key — the same orderId may
 * fire more than once (e.g. a PARTIAL followed by a SUCCESSFUL).
 */
export interface WebhookEvent {
  /** The transaction reference (refNo). Use this as your idempotency key. */
  orderId: string;
  /** Amount the customer was charged. */
  amount: number;
  /** The description supplied at checkout. */
  description?: string;
  /** Processing fee deducted. Net to merchant = `amount` minus `fee`. */
  fee: number;
  /** ISO currency code. Always "NGN" today. */
  currency?: string;
  /** Raw status: "SUCCESSFUL", "PARTIAL", or "FAILED". */
  status: string;
  /** Transaction time on the gateway, ISO-8601 local. */
  tranTime?: string;
  /** Same instant, formatted "yyyy-MM-dd HH:mm:ss". */
  transactionDate?: string;
  /** Channel: "CARD", "WALLET", "USSD", "BANK", "PAYATTITUDE". */
  productName?: string;
  /** Your business name as registered on WayaPay. */
  businessName?: string;
  /** The paying customer's details. */
  customer?: WebhookCustomer;
  /** Your merchant ID. Same value for every webhook to your account. */
  merchantId?: string;
  /** The branch tag if you've configured one; otherwise undefined. */
  branchCategory?: string;
  /** True for charges driven by a subscription / saved card. */
  recurrentPayment: boolean;
}
