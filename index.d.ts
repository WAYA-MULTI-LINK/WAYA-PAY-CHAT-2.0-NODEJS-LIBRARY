// Type definitions for the WayaPay Merchant API v2 client.

export type WayaPayErrorType = 'api' | 'validation' | 'network' | 'timeout' | 'config';

export class WayaPayError extends Error {
  name: 'WayaPayError';
  code: string | null;
  status: number | null;
  raw: unknown;
  type: WayaPayErrorType;
  constructor(
    message: string,
    opts?: { code?: string | null; status?: number | null; raw?: unknown; type?: WayaPayErrorType },
  );
}

export function generateReference(prefix?: string): string;

export interface WayaPayOptions {
  merchantId: string;
  secretKey: string;
  environment?: 'staging' | 'production';
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  fetch?: typeof fetch;
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

export class WayaPay {
  constructor(opts: WayaPayOptions);

  merchantId: string;
  secretKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;

  request<T = unknown>(
    method: string,
    path: string,
    opts?: { body?: unknown; query?: Record<string, unknown> },
  ): Promise<T>;

  banks: {
    list(): Promise<Bank[]>;
  };

  accounts: {
    verify(input: VerifyAccountInput): Promise<VerifyAccountResult>;
    createDynamic(input: CreateDynamicAccountInput): Promise<DynamicAccount>;
  };

  identity: {
    verifyBvn(input: string | { bvn: string }): Promise<BvnResult>;
  };

  payouts: {
    initiate(input: PayoutInput): Promise<PayoutResult>;
  };

  collect: {
    create(input: CollectInput): Promise<CollectResult>;
  };

  transactions: {
    verify(input: string | { reference: string }): Promise<TransactionResult>;
    history(filter?: HistoryFilter): Promise<HistoryResult>;
    historyAll(filter?: HistoryFilter): AsyncGenerator<HistoryItem, void, unknown>;
  };
}

export default WayaPay;
