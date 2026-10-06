/**
 * The registry client of the release provenance import (NXD-137): the
 * caller's credentials travel, the answer becomes a coordinate, and a refusal
 * keeps the registry's own words.
 */

import { createHttpReleaseRegistrar } from './release-registrar';

const request = {
  manifest: 'kind: DATA_PRODUCT\n',
  release: {
    imageDigest: `sha256:${'a'.repeat(64)}`,
    commitSha: 'b'.repeat(40),
  },
};

function registrar(status: number, body: unknown) {
  const getPluginRequestToken = jest.fn(async () => ({ token: 'tok' }));
  const fetchImpl = jest.fn(async () => ({
    ok: status < 300,
    status,
    json: async () => body,
  }));
  return {
    getPluginRequestToken,
    fetchImpl,
    register: createHttpReleaseRegistrar({
      discovery: { getBaseUrl: async () => 'http://registry' },
      auth: { getPluginRequestToken },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }),
  };
}

describe('createHttpReleaseRegistrar', () => {
  it('posts on behalf of the caller and answers the coordinate', async () => {
    const { register, getPluginRequestToken, fetchImpl } = registrar(201, {
      artifact: { namespace: 'pharma-data-factory', name: 'oee' },
      version: { id: 'av-1', version: '1.0.0', lifecycle: 'DRAFT' },
      alreadyRegistered: false,
    });
    const credentials = {
      principal: { userEntityRef: 'user:default/demo-pm' },
    };
    await expect(register(credentials, request)).resolves.toEqual({
      artifactRef: 'pharma-data-factory/oee@1.0.0',
      artifactVersionId: 'av-1',
      lifecycle: 'DRAFT',
      alreadyRegistered: false,
    });
    expect(getPluginRequestToken).toHaveBeenCalledWith({
      onBehalfOf: credentials,
      targetPluginId: 'artifact-registry',
    });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe('http://registry/artifacts/release-builds');
    expect(JSON.parse(String(init.body))).toEqual(request);
  });

  it("throws the registry's own message", async () => {
    const { register } = registrar(404, {
      error: {
        name: 'NotFoundError',
        message: 'No publisher owns namespace "x".',
      },
    });
    await expect(register({}, request)).rejects.toThrow(
      'No publisher owns namespace "x".',
    );
  });
});
