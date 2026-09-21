/**
 * The URS binding is only as good as its server-side check.
 *
 * A template parameter is a claim the browser made. The picker can be
 * bypassed, /compose never renders it, and scaffolder.task.create accepts any
 * value over the API. These tests pin the three outcomes that matter: an
 * approved baseline passes, an unapproved or missing one fails the task, and
 * "unbound" is deliberately allowed through — creating without a URS is fine,
 * releasing without one is not.
 */

import { createUrsVerifyBaselineAction, UNBOUND } from './scaffolderModule';

const discovery = {
  getBaseUrl: jest.fn(async () => 'http://localhost:7007/api/urs-composer'),
};

const auth = {
  getPluginRequestToken: jest.fn(async () => ({ token: 'test-token' })),
};

function ctx(ursBaselineId: string) {
  const output = jest.fn();
  return {
    input: { ursBaselineId },
    output,
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  } as never as Parameters<
    ReturnType<typeof createUrsVerifyBaselineAction>['handler']
  >[0] & { output: jest.Mock };
}

/** Stands in for the urs-composer HTTP API. */
function fetchReturning(status: number, body: unknown) {
  return jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as never as typeof fetch;
}

describe('nexora:urs:verify-baseline', () => {
  beforeEach(() => jest.clearAllMocks());

  it('passes an APPROVED baseline and reports its version', async () => {
    const action = createUrsVerifyBaselineAction({
      discovery,
      auth: auth as never,
      fetchImpl: fetchReturning(200, {
        id: 'baseline-1',
        status: 'APPROVED',
        baselineVersion: '1.0',
      }),
    } as never);

    const c = ctx('baseline-1');
    await action.handler(c);

    expect(c.output).toHaveBeenCalledWith('bound', true);
    expect(c.output).toHaveBeenCalledWith('baselineVersion', '1.0');
  });

  it('fails the task for a DRAFT baseline', async () => {
    // The case the whole check exists for: a product must not be published
    // claiming a binding to something nobody approved.
    const action = createUrsVerifyBaselineAction({
      discovery,
      auth: auth as never,
      fetchImpl: fetchReturning(200, {
        id: 'baseline-2',
        status: 'DRAFT',
        baselineVersion: '1.0',
      }),
    } as never);

    await expect(action.handler(ctx('baseline-2'))).rejects.toThrow(/APPROVED/);
  });

  it('fails the task when the baseline does not exist', async () => {
    const action = createUrsVerifyBaselineAction({
      discovery,
      auth: auth as never,
      fetchImpl: fetchReturning(404, {}),
    } as never);

    await expect(action.handler(ctx('nope'))).rejects.toThrow(/nope/);
  });

  it('lets "unbound" through without calling the API', async () => {
    // Creating a product without a URS is allowed by the agreed rule; the
    // release gate is what refuses to release it.
    const fetchImpl = fetchReturning(200, {});
    const action = createUrsVerifyBaselineAction({
      discovery,
      auth: auth as never,
      fetchImpl,
    } as never);

    const c = ctx(UNBOUND);
    await action.handler(c);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(c.output).toHaveBeenCalledWith('bound', false);
  });

  it('treats an empty value the same as unbound', async () => {
    const fetchImpl = fetchReturning(200, {});
    const action = createUrsVerifyBaselineAction({
      discovery,
      auth: auth as never,
      fetchImpl,
    } as never);

    const c = ctx('');
    await action.handler(c);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(c.output).toHaveBeenCalledWith('bound', false);
  });
});
