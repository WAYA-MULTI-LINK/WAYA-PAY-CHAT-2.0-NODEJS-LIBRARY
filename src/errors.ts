/** Category of a {@link WayaPayError}. */
export type WayaPayErrorType = 'api' | 'validation' | 'network' | 'timeout' | 'config';

export interface WayaPayErrorOptions {
  /** WayaPay envelope code, e.g. "07". `null` when not an API error. */
  code?: string | null;
  /** HTTP status, when known. */
  status?: number | null;
  /** Raw parsed body or underlying error, for logging. */
  raw?: unknown;
  /** Error category. */
  type?: WayaPayErrorType;
}

/**
 * Single error type for everything that goes wrong.
 * Branch on `.type` for the category and `.code` for the WayaPay error code.
 */
export class WayaPayError extends Error {
  override readonly name = 'WayaPayError';
  readonly code: string | null;
  readonly status: number | null;
  readonly raw: unknown;
  readonly type: WayaPayErrorType;

  constructor(message: string, opts: WayaPayErrorOptions = {}) {
    super(message);
    this.code = opts.code ?? null;
    this.status = opts.status ?? null;
    this.raw = opts.raw ?? null;
    this.type = opts.type ?? 'api';
    // Restore prototype chain for instanceof across transpile targets.
    Object.setPrototypeOf(this, WayaPayError.prototype);
  }
}
