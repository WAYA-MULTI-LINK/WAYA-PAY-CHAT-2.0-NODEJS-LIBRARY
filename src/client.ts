import { WayaPayError } from './errors.js';
import { backoff } from './util.js';
import type { FetchLike, RequestOptions, WayaPayOptions } from './types.js';
import { Identity } from './resources/identity.js';
import { Payouts } from './resources/payouts.js';
import { Collect } from './resources/collect.js';
import { Webhooks } from './resources/webhooks.js';

const PRODUCTION_BASE_URL = 'https://services.wayapay.ng/merchant-middleware/api/v2';

interface Envelope<T> {
  success?: boolean;
  code?: string;
  message?: string;
  data?: T;
  timestamp?: string;
}

/**
 * WayaPay Merchant API v2 client.
 *
 * Server side only — your secret key lives here and only here. Never ship it to
 * a browser, a mobile app, or a public repo. Build one client and reuse it.
 */
export class WayaPay {
  readonly merchantId: string;
  readonly secretKey: string;
  readonly baseUrl: string;
  readonly timeout: number;
  readonly maxRetries: number;
  readonly webhookSecret?: string;
  private readonly fetch: FetchLike;

  readonly identity: Identity;
  readonly payouts: Payouts;
  readonly collect: Collect;
  readonly webhooks: Webhooks;

  constructor(opts: WayaPayOptions) {
    const {
      merchantId,
      secretKey,
      baseUrl,
      timeout = 30000,
      maxRetries = 2,
      fetch: customFetch,
      webhookSecret,
    } = opts ?? ({} as WayaPayOptions);

    if (!merchantId) throw new WayaPayError('merchantId is required', { type: 'config' });
    if (!secretKey) throw new WayaPayError('secretKey is required', { type: 'config' });

    this.merchantId = merchantId;
    this.secretKey = secretKey;
    this.baseUrl = (baseUrl || PRODUCTION_BASE_URL).replace(/\/+$/, '');
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    this.webhookSecret = webhookSecret;

    const resolvedFetch = customFetch ?? globalThis.fetch;
    if (typeof resolvedFetch !== 'function') {
      throw new WayaPayError('No fetch found. Run on Node 18+ or pass a fetch function in options.', {
        type: 'config',
      });
    }
    this.fetch = resolvedFetch;

    this.identity = new Identity(this);
    this.payouts = new Payouts(this);
    this.collect = new Collect(this);
    this.webhooks = new Webhooks(webhookSecret);
  }

  /**
   * Low level request used by every resource. Returns the envelope's `data`.
   *
   * GET requests are retried up to `maxRetries` times on a transient failure
   * (timeout, network error, 429, or 5xx) with exponential backoff. Writes are
   * never auto retried, so a payout is only ever sent once per call.
   */
  async request<T = unknown>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const { body, query } = opts;

    const url = new URL(this.baseUrl + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      'X-Merchant-Id': this.merchantId,
      Authorization: `Bearer ${this.secretKey}`,
      accept: 'application/json',
    };

    let payload: string | undefined;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    const retryable = method === 'GET';
    const ceiling = retryable ? this.maxRetries : 0;
    let attempt = 0;
    let lastErr: WayaPayError | undefined;

    while (attempt <= ceiling) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);
      try {
        const res = await this.fetch(url, { method, headers, body: payload, signal: controller.signal });
        clearTimeout(timer);

        const text = await res.text();
        let json: Envelope<T> | null = null;
        if (text) {
          try {
            json = JSON.parse(text) as Envelope<T>;
          } catch {
            throw new WayaPayError(`Non JSON response (HTTP ${res.status})`, {
              status: res.status,
              raw: text,
              type: 'api',
            });
          }
        }

        const failed = !res.ok || (json != null && json.success === false);
        if (failed) {
          const transient = res.status >= 500 || res.status === 429;
          if (retryable && transient && attempt < ceiling) {
            attempt += 1;
            await backoff(attempt);
            continue;
          }
          throw new WayaPayError(json?.message ?? `Request failed with HTTP ${res.status}`, {
            code: json?.code ?? null,
            status: res.status,
            raw: json ?? text,
            type: 'api',
          });
        }

        return (json ? (json.data as T) : (null as T));
      } catch (err) {
        clearTimeout(timer);

        // API errors are final. No retry, just surface them.
        if (err instanceof WayaPayError && err.type === 'api') throw err;

        if (err instanceof Error && err.name === 'AbortError') {
          lastErr = new WayaPayError(`Request timed out after ${this.timeout}ms`, { type: 'timeout' });
        } else if (err instanceof WayaPayError) {
          lastErr = err;
        } else {
          const message = err instanceof Error ? err.message : 'Network error';
          lastErr = new WayaPayError(message, { type: 'network', raw: err });
        }

        if (retryable && attempt < ceiling) {
          attempt += 1;
          await backoff(attempt);
          continue;
        }
        throw lastErr;
      }
    }

    throw lastErr ?? new WayaPayError('Request failed', { type: 'network' });
  }
}

export default WayaPay;
