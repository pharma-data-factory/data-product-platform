import {
  DEFAULT_LLM_TIMEOUT_MS,
  LLMTimeoutError,
  fetchWithTimeout,
  readLLMTimeoutMs,
} from './llm-timeout';

function configWith(values: Record<string, number | undefined>) {
  return {
    getOptionalNumber: (key: string) => values[key],
  };
}

describe('readLLMTimeoutMs', () => {
  it('falls back to the default when unset', () => {
    expect(readLLMTimeoutMs(configWith({}), 'composer.ai.timeoutMs')).toBe(
      DEFAULT_LLM_TIMEOUT_MS,
    );
  });

  it('honours a configured value', () => {
    expect(
      readLLMTimeoutMs(
        configWith({ 'composer.ai.timeoutMs': 5000 }),
        'composer.ai.timeoutMs',
      ),
    ).toBe(5000);
  });

  // Zero reads like "no timeout" but AbortSignal.timeout(0) aborts at once,
  // which would look like a provider outage rather than a misconfiguration.
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses %p rather than disabling AI silently',
    value => {
      expect(() =>
        readLLMTimeoutMs(
          configWith({ 'composer.ai.timeoutMs': value }),
          'composer.ai.timeoutMs',
        ),
      ).toThrow('must be a positive number of milliseconds');
    },
  );
});

describe('fetchWithTimeout', () => {
  it('returns the response when the provider answers in time', async () => {
    const expected = new Response('ok');
    const fetchApi = jest.fn().mockResolvedValue(expected);

    await expect(
      fetchWithTimeout(
        fetchApi,
        'https://example.test',
        { method: 'POST' },
        1000,
      ),
    ).resolves.toBe(expected);
  });

  it('passes an abort signal the caller did not supply', async () => {
    const fetchApi = jest.fn().mockResolvedValue(new Response('ok'));

    await fetchWithTimeout(fetchApi, 'https://example.test', {}, 1000);

    const init = fetchApi.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal!.aborted).toBe(false);
  });

  // The behaviour the whole helper exists for: a provider that accepts the
  // connection and never answers must not hold the handler open.
  it('raises LLMTimeoutError when the provider never answers', async () => {
    const fetchApi: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(init.signal!.reason),
        );
      });

    const promise = fetchWithTimeout(fetchApi, 'https://example.test', {}, 25);

    await expect(promise).rejects.toBeInstanceOf(LLMTimeoutError);
    await expect(promise).rejects.toThrow('did not respond within 25ms');
  });

  it('leaves an unrelated network failure as itself', async () => {
    const failure = new Error('ECONNREFUSED');
    const fetchApi = jest.fn().mockRejectedValue(failure);

    await expect(
      fetchWithTimeout(fetchApi, 'https://example.test', {}, 1000),
    ).rejects.toBe(failure);
  });

  it('respects a caller-supplied signal without calling it a timeout', async () => {
    const controller = new AbortController();
    const fetchApi: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new Error('aborted by caller')),
        );
      });

    const promise = fetchWithTimeout(
      fetchApi,
      'https://example.test',
      { signal: controller.signal },
      10_000,
    );
    controller.abort();

    await expect(promise).rejects.toThrow('aborted by caller');
    await expect(promise).rejects.not.toBeInstanceOf(LLMTimeoutError);
  });
});
