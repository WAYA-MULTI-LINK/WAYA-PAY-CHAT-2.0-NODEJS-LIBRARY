// WayaPay Merchant API v2 client for Node.js
// Zero dependencies. Native fetch. Node 18+.

import { randomUUID } from 'node:crypto';

const ENVIRONMENTS = {
  staging: 'https://services.staging.wayapay.ng/merchant-middleware/api/v2',
  production: 'https://services.wayapay.ng/merchant-middleware/api/v2',
};

/**
 * Single error type for everything that goes wrong.
 * Branch on `.type` for category, `.code` for the WayaPay error code.
 */
export class WayaPayError extends Error {
  constructor(message, { code = null, status = null, raw = null, type = 'api' } = {}) {
    super(message);
    this.name = 'WayaPayError';
    this.code = code;       // WayaPay envelope code, e.g. "07". null when not an API error.
    this.status = status;   // HTTP status, when known.
    this.raw = raw;         // Raw parsed body or underlying error, for logging.
    this.type = type;       // 'api' | 'validation' | 'network' | 'timeout' | 'config'
  }
}

/**
 * Generate a unique reference. This is your dedup and reconciliation key,
 * so one per logical operation. Retries reuse the same one, new operations get a fresh one.
 */
export function generateReference(prefix = 'WP') {
  return `${prefix}-${Date.now()}-${randomUUID().split('-')[0].toUpperCase()}`;
}

function requireFields(payload, fields, context) {
  const missing = fields.filter((f) => {
    const v = payload?.[f];
    return v === undefined || v === null || v === '';
  });
  if (missing.length) {
    throw new WayaPayError(
      `Missing required field(s) for ${context}: ${missing.join(', ')}`,
      { type: 'validation' },
    );
  }
}

function backoff(attempt) {
  const base = Math.min(1000 * 2 ** (attempt - 1), 4000);
  return new Promise((r) => setTimeout(r, base + Math.random() * 200));
}

export class WayaPay {
  /**
   * @param {object} opts
   * @param {string} opts.merchantId   Your MER_... id.
   * @param {string} opts.secretKey    WAYASECK_TEST_... or WAYASECK_...
   * @param {'staging'|'production'} [opts.environment='production']
   * @param {string} [opts.baseUrl]    Override the base URL entirely.
   * @param {number} [opts.timeout=30000]
   * @param {number} [opts.maxRetries=2]  Retries apply to GET only.
   * @param {Function} [opts.fetch]    Inject a fetch implementation if you must.
   */
  constructor({
    merchantId,
    secretKey,
    environment = 'production',
    baseUrl,
    timeout = 30000,
    maxRetries = 2,
    fetch: customFetch,
  } = {}) {
    if (!merchantId) throw new WayaPayError('merchantId is required', { type: 'config' });
    if (!secretKey) throw new WayaPayError('secretKey is required', { type: 'config' });

    this.merchantId = merchantId;
    this.secretKey = secretKey;
    this.baseUrl = (baseUrl || ENVIRONMENTS[environment] || ENVIRONMENTS.production).replace(/\/+$/, '');
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    this._fetch = customFetch || globalThis.fetch;

    if (typeof this._fetch !== 'function') {
      throw new WayaPayError(
        'No fetch found. Run on Node 18+ or pass a fetch function in options.',
        { type: 'config' },
      );
    }

    this.banks = new Banks(this);
    this.accounts = new Accounts(this);
    this.identity = new Identity(this);
    this.payouts = new Payouts(this);
    this.collect = new Collect(this);
    this.transactions = new Transactions(this);
  }

  /** Low level request. Resources call this. Returns the envelope's `data`. */
  async request(method, path, { body, query } = {}) {
    const url = new URL(this.baseUrl + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    const headers = {
      'X-Merchant-Id': this.merchantId,
      Authorization: `Bearer ${this.secretKey}`,
      accept: 'application/json',
    };

    let payload;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    const retryable = method === 'GET';
    const ceiling = retryable ? this.maxRetries : 0;
    let attempt = 0;
    let lastErr;

    while (attempt <= ceiling) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);
      try {
        const res = await this._fetch(url, { method, headers, body: payload, signal: controller.signal });
        clearTimeout(timer);

        const text = await res.text();
        let json = null;
        if (text) {
          try {
            json = JSON.parse(text);
          } catch {
            throw new WayaPayError(`Non JSON response (HTTP ${res.status})`, {
              status: res.status, raw: text, type: 'api',
            });
          }
        }

        const failed = !res.ok || (json && json.success === false);
        if (failed) {
          const transient = res.status >= 500 || res.status === 429;
          if (retryable && transient && attempt < ceiling) {
            attempt += 1;
            await backoff(attempt);
            continue;
          }
          throw new WayaPayError(json?.message || `Request failed with HTTP ${res.status}`, {
            code: json?.code ?? null,
            status: res.status,
            raw: json ?? text,
            type: 'api',
          });
        }

        return json ? json.data : null;
      } catch (err) {
        clearTimeout(timer);

        // API errors are final. No retry, just surface them.
        if (err instanceof WayaPayError && err.type === 'api') throw err;

        if (err?.name === 'AbortError') {
          lastErr = new WayaPayError(`Request timed out after ${this.timeout}ms`, { type: 'timeout' });
        } else if (err instanceof WayaPayError) {
          lastErr = err;
        } else {
          lastErr = new WayaPayError(err?.message || 'Network error', { type: 'network', raw: err });
        }

        if (retryable && attempt < ceiling) {
          attempt += 1;
          await backoff(attempt);
          continue;
        }
        throw lastErr;
      }
    }
    throw lastErr;
  }
}

class Banks {
  constructor(client) { this.c = client; }
  /** GET /account-enquiry/get-bank-list -> Bank[] */
  list() {
    return this.c.request('GET', '/account-enquiry/get-bank-list');
  }
}

class Accounts {
  constructor(client) { this.c = client; }

  /** POST /account-enquiry/verify-account. bankCode optional only for WAYABANK. */
  verify({ accountNumber, bankCode, enquiryType = 'OTHERS' } = {}) {
    requireFields({ accountNumber }, ['accountNumber'], 'account verification');
    if (enquiryType !== 'WAYABANK') {
      requireFields({ bankCode }, ['bankCode'], 'account verification (external bank)');
    }
    return this.c.request('POST', '/account-enquiry/verify-account', {
      body: { accountNumber, bankCode, enquiryType },
    });
  }

  /** POST /account-enquiry/create-dynamic-account. Auto fills mode and referenceId when omitted. */
  createDynamic(input = {}) {
    const body = { mode: 'ONE_TIME', ...input };
    if (!body.referenceId) body.referenceId = generateReference('DYN');
    requireFields(body, ['accountName', 'customerId', 'referenceId', 'purpose', 'mode'], 'dynamic account');
    return this.c.request('POST', '/account-enquiry/create-dynamic-account', { body });
  }
}

class Identity {
  constructor(client) { this.c = client; }

  /** POST /identity-verification/bvn. Accepts a string or { bvn }. */
  verifyBvn(input) {
    const bvn = typeof input === 'string' ? input : input?.bvn;
    if (!/^\d{11}$/.test(String(bvn ?? ''))) {
      throw new WayaPayError('bvn must be an 11 digit string', { type: 'validation' });
    }
    return this.c.request('POST', '/identity-verification/bvn', { body: { bvn } });
  }
}

class Payouts {
  constructor(client) { this.c = client; }

  /** POST /payment-payout/initiate. Defaults NGN, auto generates reference when omitted. */
  initiate(input = {}) {
    const body = { currency: 'NGN', ...input };
    if (!body.reference) body.reference = generateReference('PAYOUT');
    requireFields(
      body,
      ['amount', 'currency', 'accountNumber', 'bankCode', 'accountName', 'reference', 'narration'],
      'payout',
    );
    return this.c.request('POST', '/payment-payout/initiate', { body });
  }
}

class Collect {
  constructor(client) { this.c = client; }

  /** POST /payment-collect/initiate. Defaults a one time NGN link. */
  create(input = {}) {
    const body = { paymentLinkType: 'ONE_TIME_PAYMENT_LINK', currency: 'NGN', ...input };
    requireFields(
      body,
      ['paymentLinkType', 'paymentLinkName', 'description', 'payableAmount', 'currency', 'redirectLink'],
      'payment collect',
    );
    if (body.linkCanExpire === true) {
      requireFields(body, ['expiryDate'], 'payment collect (expiry)');
    }
    return this.c.request('POST', '/payment-collect/initiate', { body });
  }
}

class Transactions {
  constructor(client) { this.c = client; }

  /** GET /transaction/verify?reference=. Accepts a string or { reference }. */
  verify(input) {
    const reference = typeof input === 'string' ? input : input?.reference;
    requireFields({ reference }, ['reference'], 'transaction verify');
    return this.c.request('GET', '/transaction/verify', { query: { reference } });
  }

  /** GET /transaction/history. One page. */
  history({ page = 0, size = 20, status, from, to } = {}) {
    return this.c.request('GET', '/transaction/history', { query: { page, size, status, from, to } });
  }

  /**
   * Walk every page of history as one stream. Built for reconciliation.
   * for await (const txn of client.transactions.historyAll({ status: 'SUCCESS' })) { ... }
   */
  async *historyAll(filter = {}) {
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

export default WayaPay;
