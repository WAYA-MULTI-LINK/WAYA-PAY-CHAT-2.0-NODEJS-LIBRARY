import type { WayaPay } from '../client.js';
import { requireFields } from '../util.js';
import type { HistoryFilter, HistoryItem, HistoryResult, TransactionResult } from '../types.js';

export class Transactions {
  constructor(private readonly client: WayaPay) {}

  /**
   * Verify one transaction by reference. Accepts a string or `{ reference }`.
   * Trust the returned status over your own assumptions.
   *
   * `GET /transaction/verify?reference=...`
   */
  async verify(input: string | { reference: string }): Promise<TransactionResult> {
    const reference = typeof input === 'string' ? input : input?.reference;
    requireFields({ reference }, ['reference'], 'transaction verify');
    return this.client.request<TransactionResult>('GET', '/transaction/verify', {
      query: { reference },
    });
  }

  /**
   * Fetch one page of transaction history.
   *
   * `GET /transaction/history`
   */
  history(filter: HistoryFilter = {}): Promise<HistoryResult> {
    const { page = 0, size = 20, status, from, to } = filter;
    return this.client.request<HistoryResult>('GET', '/transaction/history', {
      query: { page, size, status, from, to },
    });
  }

  /**
   * Walk every page of history as one async stream. Built for reconciliation.
   *
   * ```ts
   * for await (const txn of client.transactions.historyAll({ status: 'SUCCESS' })) { ... }
   * ```
   */
  async *historyAll(filter: HistoryFilter = {}): AsyncGenerator<HistoryItem, void, unknown> {
    const size = filter.size ?? 20;
    let page = filter.page ?? 0;
    while (true) {
      const data = await this.history({ ...filter, page, size });
      for (const item of data?.items ?? []) yield item;
      page += 1;
      if (!data?.totalPages || page >= data.totalPages) break;
    }
  }
}
