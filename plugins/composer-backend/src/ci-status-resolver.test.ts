import {
  createHttpCiStatusResolver,
  evaluateCiStatusForReleaseGate,
  parseCiStatusSnapshot,
} from './ci-status-resolver';

describe('ci-status-resolver', () => {
  it('parseCiStatusSnapshot maps known statuses and falls back to UNKNOWN', () => {
    expect(parseCiStatusSnapshot({ status: 'PASSED' }).status).toBe('PASSED');
    expect(parseCiStatusSnapshot({ status: 'FAILED' }).status).toBe('FAILED');
    expect(parseCiStatusSnapshot({ status: 'bogus' }).status).toBe('UNKNOWN');
    expect(parseCiStatusSnapshot(null).status).toBe('UNKNOWN');
    expect(
      parseCiStatusSnapshot({
        status: 'PASSED',
        commitSha: 'abc1234',
        htmlUrl: 'https://github.com/o/r/actions/runs/1',
        branch: 'main',
      }),
    ).toEqual(
      expect.objectContaining({
        status: 'PASSED',
        commitSha: 'abc1234',
        htmlUrl: 'https://github.com/o/r/actions/runs/1',
        branch: 'main',
      }),
    );
  });

  it('evaluateCiStatusForReleaseGate only clears on PASSED', () => {
    expect(evaluateCiStatusForReleaseGate({ status: 'PASSED' })).toEqual([]);
    expect(
      evaluateCiStatusForReleaseGate({ status: 'FAILED' })[0]?.code,
    ).toBe('CI_STATUS_FAILED');
    expect(
      evaluateCiStatusForReleaseGate({ status: 'RUNNING' })[0]?.code,
    ).toBe('CI_STATUS_RUNNING');
    expect(
      evaluateCiStatusForReleaseGate({ status: 'CANCELLED' })[0]?.code,
    ).toBe('CI_STATUS_CANCELLED');
    expect(
      evaluateCiStatusForReleaseGate({
        status: 'UNKNOWN',
        message: 'Not available',
      })[0],
    ).toEqual({
      code: 'CI_STATUS_UNVERIFIED',
      message: 'Not available',
    });
  });

  it('createHttpCiStatusResolver calls data-products with plugin token', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'PASSED', workflowName: 'CI' }),
    });
    const resolver = createHttpCiStatusResolver({
      discovery: {
        getBaseUrl: jest.fn().mockResolvedValue('http://dp'),
      },
      auth: {
        getPluginRequestToken: jest.fn().mockResolvedValue({ token: 't-1' }),
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const snap = await resolver.resolveByEntityRef(
      'component:default/cold-room',
      { user: 'u1' },
    );
    expect(snap).toEqual({ status: 'PASSED', workflowName: 'CI' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://dp/ci-status?entityRef=component%3Adefault%2Fcold-room',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer t-1',
        }),
      }),
    );
  });
});
