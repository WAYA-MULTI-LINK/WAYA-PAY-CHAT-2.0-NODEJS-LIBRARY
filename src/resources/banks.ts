import type { WayaPay } from '../client.js';
import type { Bank } from '../types.js';

export class Banks {
  constructor(private readonly client: WayaPay) {}

  /**
   * List the supported banks with their CBN codes. GET, so it is retried
   * automatically on a transient failure.
   *
   * `GET /account-enquiry/get-bank-list`
   */
  async list(): Promise<Bank[]> {
    return (await this.client.request<Bank[]>('GET', '/account-enquiry/get-bank-list')) ?? [];
  }
}
