import { InputError } from '@backstage/errors';
import { createHttpUrsBaselineResolver } from './urs-baseline-resolver';

describe('createHttpUrsBaselineResolver', () => {
  const credentials = { principal: { userEntityRef: 'user:default/alice' } };

  function mockFetch(handlers: Record<string, () => Response>) {
    return jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const keys = Object.keys(handlers).sort((a, b) => b.length - a.length);
      for (const key of keys) {
        if (url.includes(key)) {
          return handlers[key]();
        }
      }
      return new Response('not found', { status: 404 });
    }) as unknown as typeof fetch;
  }

  it('forwards on-behalf-of credentials and maps stable requirementIds', async () => {
    const getPluginRequestToken = jest.fn().mockResolvedValue({ token: 'obo-token' });
    const fetchImpl = mockFetch({
      '/baselines/bl-1': () =>
        Response.json({
          id: 'bl-1',
          requirementSetId: 'set-1',
          baselineVersion: '1.0',
          status: 'APPROVED',
          requirementVersionIds: ['ver-a', 'ver-b'],
          approvedBy: 'user:default/approver',
        }),
      '/requirement-sets/set-1': () =>
        Response.json({
          solutionName: 'OEE Line',
          businessCapabilityRefs: ['cap-1'],
        }),
      '/requirement-versions/ver-a': () =>
        Response.json({ id: 'ver-a', requirementId: 'URS-OEE-001' }),
      '/requirement-versions/ver-b': () =>
        Response.json({ id: 'ver-b', requirementId: 'URS-OEE-002' }),
    });

    const resolver = createHttpUrsBaselineResolver({
      discovery: {
        getBaseUrl: async () => 'http://urs.example/api/urs-composer',
      },
      auth: { getPluginRequestToken },
      fetchImpl,
    });

    const { reference } = await resolver.resolveApprovedBaseline(
      { requirementSetId: 'set-1', baselineId: 'bl-1' },
      credentials,
    );

    expect(getPluginRequestToken).toHaveBeenCalledWith({
      onBehalfOf: credentials,
      targetPluginId: 'urs-composer',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://urs.example/api/urs-composer/baselines/bl-1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer obo-token',
        }),
      }),
    );
    expect(reference.requirementIds).toEqual(['URS-OEE-001', 'URS-OEE-002']);
    expect(reference.requirementSetId).toBe('set-1');
    expect(reference.requirementSetTitle).toBe('OEE Line');
    expect(reference.businessCapabilityIds).toEqual(['cap-1']);
    expect(reference.approvalStatus).toBe('APPROVED');
  });

  it('rejects requirementSetId mismatch', async () => {
    const resolver = createHttpUrsBaselineResolver({
      discovery: {
        getBaseUrl: async () => 'http://urs.example/api/urs-composer',
      },
      auth: {
        getPluginRequestToken: async () => ({ token: 't' }),
      },
      fetchImpl: mockFetch({
        '/baselines/bl-1': () =>
          Response.json({
            id: 'bl-1',
            requirementSetId: 'other-set',
            baselineVersion: '1.0',
            status: 'APPROVED',
            requirementVersionIds: [],
          }),
      }),
    });

    await expect(
      resolver.resolveApprovedBaseline(
        { requirementSetId: 'set-1', baselineId: 'bl-1' },
        credentials,
      ),
    ).rejects.toBeInstanceOf(InputError);
  });

  it('requires caller credentials', async () => {
    const resolver = createHttpUrsBaselineResolver({
      discovery: {
        getBaseUrl: async () => 'http://urs.example/api/urs-composer',
      },
      auth: {
        getPluginRequestToken: async () => ({ token: 't' }),
      },
      fetchImpl: mockFetch({}),
    });

    await expect(
      resolver.resolveApprovedBaseline(
        { requirementSetId: 'set-1', baselineId: 'bl-1' },
        undefined,
      ),
    ).rejects.toThrow(/credentials are required/i);
  });

  it('denies non-APPROVED baselines', async () => {
    const resolver = createHttpUrsBaselineResolver({
      discovery: {
        getBaseUrl: async () => 'http://urs.example/api/urs-composer',
      },
      auth: {
        getPluginRequestToken: async () => ({ token: 't' }),
      },
      fetchImpl: mockFetch({
        '/baselines/bl-1': () =>
          Response.json({
            id: 'bl-1',
            requirementSetId: 'set-1',
            status: 'DRAFT',
            requirementVersionIds: [],
          }),
      }),
    });

    await expect(
      resolver.resolveApprovedBaseline(
        { requirementSetId: 'set-1', baselineId: 'bl-1' },
        credentials,
      ),
    ).rejects.toThrow(/DRAFT/);
  });

  it('resolveBaselineRequirements prefers change-set content', async () => {
    const getPluginRequestToken = jest.fn().mockResolvedValue({ token: 'obo' });
    const fetchImpl = mockFetch({
      '/baselines/bl-1/change-set': () =>
        Response.json({
          baselineId: 'bl-1',
          changes: [
            {
              requirementId: 'URS-OEE-001',
              changeType: 'ADDED',
              currentVersion: {
                id: 'ver-a',
                requirementId: 'URS-OEE-001',
                title: 'Capture OEE',
                statement: 'The solution shall capture OEE.',
                priority: 'MUST',
                status: 'APPROVED',
              },
            },
            {
              requirementId: 'URS-OEE-GONE',
              changeType: 'REMOVED',
              previousVersion: {
                id: 'ver-x',
                requirementId: 'URS-OEE-GONE',
                title: 'Removed',
                statement: 'Gone',
              },
            },
          ],
        }),
    });

    const resolver = createHttpUrsBaselineResolver({
      discovery: {
        getBaseUrl: async () => 'http://urs.example/api/urs-composer',
      },
      auth: { getPluginRequestToken },
      fetchImpl,
    });

    const items = await resolver.resolveBaselineRequirements('bl-1', credentials);
    expect(items).toEqual([
      expect.objectContaining({
        requirementId: 'URS-OEE-001',
        title: 'Capture OEE',
        statement: 'The solution shall capture OEE.',
        priority: 'MUST',
        changeType: 'ADDED',
      }),
    ]);
    expect(getPluginRequestToken).toHaveBeenCalledWith({
      onBehalfOf: credentials,
      targetPluginId: 'urs-composer',
    });
  });

  it('resolveBaselineRequirements falls back to requirement versions', async () => {
    const fetchImpl = mockFetch({
      '/baselines/bl-1/change-set': () => new Response('nope', { status: 500 }),
      '/baselines/bl-1': () =>
        Response.json({
          id: 'bl-1',
          requirementVersionIds: ['ver-a'],
        }),
      '/requirement-versions/ver-a': () =>
        Response.json({
          id: 'ver-a',
          requirementId: 'URS-OEE-001',
          title: 'Fallback title',
          statement: 'Fallback statement',
        }),
    });

    const resolver = createHttpUrsBaselineResolver({
      discovery: {
        getBaseUrl: async () => 'http://urs.example/api/urs-composer',
      },
      auth: {
        getPluginRequestToken: async () => ({ token: 't' }),
      },
      fetchImpl,
    });

    const items = await resolver.resolveBaselineRequirements('bl-1', credentials);
    expect(items).toEqual([
      expect.objectContaining({
        requirementId: 'URS-OEE-001',
        title: 'Fallback title',
        statement: 'Fallback statement',
        requirementVersionId: 'ver-a',
      }),
    ]);
  });
});
