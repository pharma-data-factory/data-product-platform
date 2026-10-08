/**
 * The registry's question to the Composer (NXD-146): asked with the
 * registry's own service credentials, and a refusal is an error, never an
 * answer.
 */

import { createHttpReleaseStatusReader } from './releaseStatusClient';

describe('createHttpReleaseStatusReader', () => {
  const own = { principal: { type: 'service', subject: 'plugin:artifact-registry' } };
  const auth = {
    getOwnServiceCredentials: jest.fn(async () => own),
    getPluginRequestToken: jest.fn(async () => ({ token: 'tok' })),
  };
  const discovery = { getBaseUrl: async () => 'http://composer' };

  it('asks the Composer route with its own credentials', async () => {
    const fetchImpl = jest.fn(
      async () =>
        new Response(JSON.stringify({ governed: true, released: true, productVersions: [] }), {
          status: 200,
        }),
    );
    const read = createHttpReleaseStatusReader({ discovery, auth, fetchImpl: fetchImpl as never });
    const status = await read({ namespace: 'pharma', name: 'oee', version: '1.0.0' });
    expect(status.released).toBe(true);
    expect(auth.getPluginRequestToken).toHaveBeenCalledWith({ onBehalfOf: own, targetPluginId: 'composer' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://composer/artifacts/pharma/oee/versions/1.0.0/release-status',
      { headers: { Authorization: 'Bearer tok' } },
    );
  });

  it('throws on a refusal rather than reading it as an answer', async () => {
    const fetchImpl = jest.fn(async () => new Response('{}', { status: 403 }));
    const read = createHttpReleaseStatusReader({ discovery, auth, fetchImpl: fetchImpl as never });
    await expect(read({ namespace: 'a', name: 'b', version: '1' })).rejects.toThrow(/answered 403/);
  });
});
