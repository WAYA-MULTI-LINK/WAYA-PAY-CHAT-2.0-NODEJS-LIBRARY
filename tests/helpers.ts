import { WayaPay } from '../src/index.js';
import type { FetchLike, WayaPayOptions } from '../src/index.js';

/** A recorded request, captured by {@link capturingFetch}. */
export interface CapturedCall {
  url: URL;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

/** Wrap data in the success envelope the API returns. */
export function okBody(data: unknown): string {
  return JSON.stringify({ success: true, code: '00', data });
}

/** Wrap an error envelope the API returns when success is false. */
export function errBody(code: string, message: string): string {
  return JSON.stringify({ success: false, code, message });
}

function makeResponse(status: number, body: string): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
}

/** A fetch that always resolves to the given status + body. */
export function stubFetch(status: number, body: string): FetchLike {
  return () => Promise.resolve(makeResponse(status, body));
}

/**
 * A fetch that records every call and resolves to a fixed status + body.
 * Inspect `.calls` to assert on method, URL, headers, and request payload.
 */
export function capturingFetch(
  status = 200,
  body = okBody({}),
): FetchLike & { calls: CapturedCall[] } {
  const calls: CapturedCall[] = [];
  const fn: FetchLike = (input, init) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const raw = init?.body;
    calls.push({
      url,
      method: init?.method ?? 'GET',
      headers,
      body: typeof raw === 'string' && raw.length ? JSON.parse(raw) : undefined,
    });
    return Promise.resolve(makeResponse(status, body));
  };
  return Object.assign(fn, { calls });
}

/**
 * A fetch that returns a queued sequence of [status, body] responses, one per
 * call, repeating the last once drained. Drives retry and pagination tests.
 */
export function sequenceFetch(
  responses: ReadonlyArray<[number, string]>,
): FetchLike & { calls: number } {
  const state = { calls: 0 };
  const fn: FetchLike = () => {
    const i = Math.min(state.calls, responses.length - 1);
    state.calls += 1;
    const [status, body] = responses[i]!;
    return Promise.resolve(makeResponse(status, body));
  };
  Object.defineProperty(fn, 'calls', { get: () => state.calls });
  return fn as unknown as FetchLike & { calls: number };
}

/** A fetch that never resolves until its signal aborts, then rejects AbortError. */
export function hangingFetch(): FetchLike {
  return (_input, init) =>
    new Promise((_resolve, reject) => {
      const signal = init?.signal;
      if (signal) {
        signal.addEventListener('abort', () => {
          const e = new Error('aborted');
          e.name = 'AbortError';
          reject(e);
        });
      }
    });
}

/** A fetch that rejects with a plain network error. */
export function failingFetch(message = 'connection refused'): FetchLike {
  return () => Promise.reject(new Error(message));
}

/** Build a client backed by the given fetch. Retries off by default. */
export function makeClient(fetch: FetchLike, extra: Partial<WayaPayOptions> = {}): WayaPay {
  return new WayaPay({
    merchantId: 'MER_TEST',
    secretKey: 'WAYASECK_TEST_key',
    maxRetries: 0,
    fetch,
    ...extra,
  });
}
