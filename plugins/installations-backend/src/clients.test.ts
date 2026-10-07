/**
 * The clients to the registry, the Composer and the URS Composer (NXD-139):
 * each sends a token minted on behalf of the caller, and maps the other
 * plugin's answer without ever weakening a GMP classification.
 */

import { NotAllowedError, ServiceUnavailableError } from '@backstage/errors';
import {
  createHttpArtifactVersionReader,
  createHttpGmpClassifier,
  createHttpPinVerifier,
} from './clients';

const CREDENTIALS = { principal: { type: 'user', userEntityRef: 'user:default/o' } };

function harness(status: number, body: unknown) {
  const tokens: Array<{ onBehalfOf: unknown; targetPluginId: string }> = [];
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const options = {
    discovery: { getBaseUrl: async (id: string) => `http://backend/api/${id}` },
    auth: {
      getPluginRequestToken: async (o: { onBehalfOf: unknown; targetPluginId: string }) => {
        tokens.push(o);
        return { token: `token-for-${o.targetPluginId}` };
      },
    },
    fetchImpl: (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(body), { status });
    }) as unknown as typeof fetch,
  };
  return { options, tokens, calls };
}

describe('artifact version reader', () => {
  it('reads the version on behalf of the caller', async () => {
    const h = harness(200, { id: 'v1', lifecycle: 'RELEASED' });
    const read = createHttpArtifactVersionReader(h.options);
    expect(await read(CREDENTIALS, { namespace: 'pharma', name: 'oee', version: '1.0.0' })).toEqual({
      id: 'v1',
      lifecycle: 'RELEASED',
    });
    expect(h.tokens).toEqual([{ onBehalfOf: CREDENTIALS, targetPluginId: 'artifact-registry' }]);
    expect(h.calls[0].url).toBe('http://backend/api/artifact-registry/artifacts/pharma/oee/versions/1.0.0');
    expect((h.calls[0].init?.headers as Record<string, string>).Authorization).toBe(
      'Bearer token-for-artifact-registry',
    );
  });

  it('answers nothing for 404, refuses for 403, and is unavailable otherwise', async () => {
    const coordinate = { namespace: 'p', name: 'o', version: '1.0' };
    expect(await createHttpArtifactVersionReader(harness(404, {}).options)(CREDENTIALS, coordinate)).toBe(
      undefined,
    );
    await expect(
      createHttpArtifactVersionReader(harness(403, { error: 'no' }).options)(CREDENTIALS, coordinate),
    ).rejects.toThrow(NotAllowedError);
    await expect(
      createHttpArtifactVersionReader(harness(500, {}).options)(CREDENTIALS, coordinate),
    ).rejects.toThrow(ServiceUnavailableError);
  });
});

describe('GMP classifier', () => {
  const logger = { warn: jest.fn() };
  const artifact = { namespace: 'pharma', name: 'oee' };

  it('takes the governing product’s answer', async () => {
    const h = harness(200, { governed: true, gmpRelevant: false });
    expect(await createHttpGmpClassifier({ ...h.options, logger })(CREDENTIALS, artifact)).toEqual({
      gmpRelevant: false,
      source: 'PRODUCT',
    });
    expect(h.calls[0].url).toBe('http://backend/api/composer/artifacts/pharma/oee/gmp-classification');
    expect(h.tokens[0]).toEqual({ onBehalfOf: CREDENTIALS, targetPluginId: 'composer' });
  });

  it('classifies an artifact no product governs as not GMP-relevant', async () => {
    const h = harness(200, { governed: false, gmpRelevant: false });
    expect(await createHttpGmpClassifier({ ...h.options, logger })(CREDENTIALS, artifact)).toEqual({
      gmpRelevant: false,
      source: 'NO_PRODUCT',
    });
  });

  it('treats a refusal, an error or an unreadable answer as GMP-relevant', async () => {
    for (const [status, body] of [
      [403, { error: 'no product.read' }],
      [500, {}],
      [200, { governed: true }],
    ] as const) {
      const h = harness(status, body);
      expect(await createHttpGmpClassifier({ ...h.options, logger })(CREDENTIALS, artifact)).toEqual({
        gmpRelevant: true,
        source: 'UNAVAILABLE',
      });
    }
    expect(logger.warn).toHaveBeenCalledTimes(3);
  });
});

describe('PIN verifier', () => {
  it('verifies in the URS Composer on behalf of the signer', async () => {
    const h = harness(200, { method: 'signature-pin' });
    expect(await createHttpPinVerifier(h.options)(CREDENTIALS, '1234')).toBe('signature-pin');
    expect(h.tokens).toEqual([{ onBehalfOf: CREDENTIALS, targetPluginId: 'urs-composer' }]);
    expect(h.calls[0].url).toBe('http://backend/api/urs-composer/signing-pin/verify');
    expect(h.calls[0].init?.body).toBe(JSON.stringify({ pin: '1234' }));
  });

  it('turns the URS Composer’s refusal into a refusal, with its words', async () => {
    const h = harness(403, { error: 'Too many failed attempts. Locked.' });
    await expect(createHttpPinVerifier(h.options)(CREDENTIALS, 'x')).rejects.toThrow(
      new NotAllowedError('Too many failed attempts. Locked.'),
    );
    await expect(createHttpPinVerifier(harness(500, {}).options)(CREDENTIALS, 'x')).rejects.toThrow(
      /could not be verified: 500/,
    );
  });
});
