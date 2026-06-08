import type { WayaPay } from '../client.js';
import { generateReference, requireFields } from '../util.js';
import type {
  CreateDynamicAccountInput,
  DynamicAccount,
  VerifyAccountInput,
  VerifyAccountResult,
} from '../types.js';

export class Accounts {
  constructor(private readonly client: WayaPay) {}

  /**
   * Resolve an account number to its registered name. `bankCode` is required
   * unless `enquiryType` is `WAYABANK`. Always verify a destination before you
   * pay it.
   *
   * `POST /account-enquiry/verify-account`
   */
  async verify(input: VerifyAccountInput): Promise<VerifyAccountResult> {
    const { accountNumber, bankCode, enquiryType = 'OTHERS' } = input ?? ({} as VerifyAccountInput);
    requireFields({ accountNumber }, ['accountNumber'], 'account verification');
    if (enquiryType !== 'WAYABANK') {
      requireFields({ bankCode }, ['bankCode'], 'account verification (external bank)');
    }
    return this.client.request<VerifyAccountResult>('POST', '/account-enquiry/verify-account', {
      body: { accountNumber, bankCode, enquiryType },
    });
  }

  /**
   * Mint a virtual NUBAN account a customer can pay into. Auto-fills `mode`
   * (`ONE_TIME`) and `referenceId` when omitted.
   *
   * `POST /account-enquiry/create-dynamic-account`
   */
  async createDynamic(input: CreateDynamicAccountInput): Promise<DynamicAccount> {
    const body: Record<string, unknown> = { mode: 'ONE_TIME', ...input };
    if (!body['referenceId']) body['referenceId'] = generateReference('DYN');
    requireFields(
      body,
      ['accountName', 'customerId', 'referenceId', 'purpose', 'mode'],
      'dynamic account',
    );
    return this.client.request<DynamicAccount>('POST', '/account-enquiry/create-dynamic-account', {
      body,
    });
  }
}
