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

export interface CreateDynamicAccountInput {
  accountName: string;
  customerId: string;
  referenceId?: string;
  purpose: string;
  mode?: string;
}

export interface DynamicAccount {
  id: number;
  virtualAccountNumber: string;
  nubanNumber: string;
  accountName: string;
  customerId: string;
  accountType: string;
  status: string;
  isActive: boolean;
  canReceivePayments: boolean;
  referenceId: string;
  metadata: string;
  totalLimit: number;
  currentBalance: number;
  assignedAt: string;
  expiresAt: string;
  createdAt: string;
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

export interface TransactionResult {
  transactionReference: string;
  merchantReference: string;
  status: string;
  amount: number;
  currency: string;
  channel: string;
  customerEmail: string;
  paidAt?: string;
}

export interface HistoryItem {
  transactionReference: string;
  merchantReference: string;
  amount: number;
  currency: string;
  status: string;
  channel: string;
  customerEmail: string;
  createdAt: string;
}

export interface HistoryFilter {
  page?: number;
  size?: number;
  status?: string;
  from?: string;
  to?: string;
}

export interface HistoryResult {
  items: HistoryItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
