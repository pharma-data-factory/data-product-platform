import {
  createHttpUrsBaselineResolver,
  UrsBaselineResolutionError,
  ursReleaseGateBlockerFromError,
} from './urs-baseline-resolver';

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

  it('lists APPROVED baselines across requirement sets', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'set-1', solutionName: 'Cold Chain' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 'bl-draft', status: 'DRAFT', baselineVersion: '0.1' },
            {
              id: 'bl-ok',
              status: 'APPROVED',
              baselineVersion: '1.0',
              requirementSetId: 'set-1',
            },
          ],
        }),
      });

    const resolver = createHttpUrsBaselineResolver({
      discovery: { getBaseUrl: async () => 'http://urs.test' },
      auth: {
        getPluginRequestToken: async () => ({ token: 'obo' }),
      },
      fetchImpl: fetchImpl as typeof fetch,
    });

    const items = await resolver.listApprovedBaselines({ principal: 'u' });
    expect(items).toEqual([
      {
        id: 'bl-ok',
        status: 'APPROVED',
        baselineVersion: '1.0',
        requirementSetId: 'set-1',
        solutionName: 'Cold Chain',
      },
    ]);
  });

  it('throws UrsBaselineResolutionError SUPERSEDED with successor id', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'bl-old',
        status: 'SUPERSEDED',
        baselineVersion: '1.0',
        supersededBy: 'bl-new',
      }),
    });
    const resolver = createHttpUrsBaselineResolver({
      discovery: { getBaseUrl: async () => 'http://urs.test' },
      auth: {
        getPluginRequestToken: async () => ({ token: 'obo' }),
      },
      fetchImpl: fetchImpl as typeof fetch,
    });

    await expect(
      resolver.resolveApprovedBaseline('bl-old', { principal: 'u' }),
    ).rejects.toMatchObject({
      name: 'UrsBaselineResolutionError',
      kind: 'SUPERSEDED',
      supersededBy: 'bl-new',
    });
  });

  it('inspectBaseline returns SUPERSEDED without throwing', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'bl-old',
        status: 'SUPERSEDED',
        baselineVersion: '1.0',
        supersededBy: 'bl-new',
      }),
    });
    const resolver = createHttpUrsBaselineResolver({
      discovery: { getBaseUrl: async () => 'http://urs.test' },
      auth: {
        getPluginRequestToken: async () => ({ token: 'obo' }),
      },
      fetchImpl: fetchImpl as typeof fetch,
    });

    await expect(
      resolver.inspectBaseline('bl-old', { principal: 'u' }),
    ).resolves.toEqual({
      id: 'bl-old',
      status: 'SUPERSEDED',
      baselineVersion: '1.0',
      requirementSetId: undefined,
      supersededBy: 'bl-new',
    });
  });
});

describe('ursReleaseGateBlockerFromError', () => {
  it('maps SUPERSEDED to URS_BASELINE_SUPERSEDED', () => {
    const err = new UrsBaselineResolutionError({
      kind: 'SUPERSEDED',
      baselineId: 'bl-1',
      status: 'SUPERSEDED',
      supersededBy: 'bl-2',
      message: 'URS baseline bl-1 is SUPERSEDED; expected APPROVED',
    });
    const blocker = ursReleaseGateBlockerFromError('bl-1', err);
    expect(blocker.code).toBe('URS_BASELINE_SUPERSEDED');
    expect(blocker.message).toContain('SUPERSEDED');
    expect(blocker.message).toContain('bl-2');
  });

  it('maps other failures to NO_APPROVED_URS_BASELINE', () => {
    const err = new UrsBaselineResolutionError({
      kind: 'NOT_APPROVED',
      baselineId: 'bl-1',
      status: 'DRAFT',
      message: 'URS baseline bl-1 is DRAFT; expected APPROVED',
    });
    expect(ursReleaseGateBlockerFromError('bl-1', err).code).toBe(
      'NO_APPROVED_URS_BASELINE',
    );
  });
});
