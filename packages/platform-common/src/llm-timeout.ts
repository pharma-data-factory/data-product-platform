/**
 * A deadline for outbound LLM calls.
 *
 * Both LLM clients in this repository (`composer-backend`, `urs-composer-backend`)
 * called their provider with no deadline at all. That is not a slow-request
 * problem, it is an availability one: `fetch` without a signal waits on the
 * socket indefinitely, so a provider that accepts a connection and then stops
 * answering holds the Express handler, and with it a connection from the
 * plugin's knex pool, until the process restarts. Enough of those and the
 * whole backend stops answering — not just the AI feature that caused it.
 *
 * `AbortSignal.timeout` is the platform's own mechanism (Node 18+, and this
 * repository requires 22 or 24), so this adds no dependency.
 */

/** Deadline applied when none is configured. Generous: these are LLM calls. */
export const DEFAULT_LLM_TIMEOUT_MS = 60_000;

/**
 * Raised when the deadline expires, in place of the provider's own error.
 *
 * Distinguishable from a provider 5xx on purpose: a timeout means the request
 * may well have been received and acted on, so a caller must not treat it as
 * "nothing happened" and silently retry a write.
 */
export class LLMTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, cause?: unknown) {
    super(
      `LLM provider did not respond within ${timeoutMs}ms. The request was ` +
        `abandoned; it may still have been processed upstream.`,
    );
    this.name = 'LLMTimeoutError';
    this.timeoutMs = timeoutMs;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

/**
 * Reads a timeout from config, falling back to {@link DEFAULT_LLM_TIMEOUT_MS}.
 *
 * `key` is the full config path (e.g. `composer.ai.timeoutMs`) so the two
 * plugins keep their own namespaces rather than sharing one.
 *
 * A non-positive value is rejected rather than honoured. `timeoutMs: 0` reads
 * like "no timeout" but `AbortSignal.timeout(0)` aborts immediately, which
 * would disable AI entirely and look like a provider outage.
 */
export function readLLMTimeoutMs(
  config: { getOptionalNumber(key: string): number | undefined },
  key: string,
): number {
  const configured = config.getOptionalNumber(key);
  if (configured === undefined) {
    return DEFAULT_LLM_TIMEOUT_MS;
  }
  if (!Number.isFinite(configured) || configured <= 0) {
    throw new Error(
      `${key} must be a positive number of milliseconds, got ${configured}. ` +
        `Omit it to use the default of ${DEFAULT_LLM_TIMEOUT_MS}ms.`,
    );
  }
  return configured;
}

/**
 * `fetch` with a deadline, translating the abort into {@link LLMTimeoutError}.
 *
 * An `init.signal` supplied by the caller is respected: the request then
 * aborts on whichever fires first, and a caller-driven abort surfaces as
 * itself rather than as a timeout.
 */
export async function fetchWithTimeout(
  fetchApi: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const deadline = AbortSignal.timeout(timeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, deadline])
    : deadline;

  try {
    return await fetchApi(url, { ...init, signal });
  } catch (error) {
    // Only the deadline maps to LLMTimeoutError. A caller-driven abort, a DNS
    // failure or a refused connection are different conditions and keep their
    // own errors.
    if (deadline.aborted) {
      throw new LLMTimeoutError(timeoutMs, error);
    }
    throw error;
  }
}
