import { createHttpUrsBaselineResolver } from './urs-baseline-resolver';

describe('createHttpUrsBaselineResolver auth', () => {
  it('issues an on-behalf-of plugin token with caller credentials', async () => {
    const credentials = { principal: { userEntityRef: 'user:default/alice' } };
    const getPluginRequestToken = jest
      .fn()
      .mockResolvedValue({ token: 'obo-token' });
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'bl-1',
        status: 'APPROVED',
        baselineVersion: '1.0',
      }),
    });

    const resolver = createHttpUrsBaselineResolver({
      discovery: {
        getBaseUrl: async () => 'http://urs.test',
      },
      auth: { getPluginRequestToken },
      fetchImpl: fetchImpl as typeof fetch,
    });

    await resolver.resolveApprovedBaseline('bl-1', credentials);

    expect(getPluginRequestToken).toHaveBeenCalledWith({
      onBehalfOf: credentials,
      targetPluginId: 'urs-composer',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://urs.test/baselines/bl-1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer obo-token',
        }),
      }),
    );
  });

  it('refuses to call URS without caller credentials', async () => {
    const resolver = createHttpUrsBaselineResolver({
      discovery: {
        getBaseUrl: async () => 'http://urs.test',
      },
      auth: {
        getPluginRequestToken: async () => ({ token: 'x' }),
      },
      fetchImpl: jest.fn() as typeof fetch,
    });

    await expect(
      resolver.resolveApprovedBaseline('bl-1', undefined),
    ).rejects.toThrow(/credentials are required/i);
  });
});
