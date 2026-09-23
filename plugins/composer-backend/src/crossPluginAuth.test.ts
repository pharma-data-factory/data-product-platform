/**
 * The call shape of every cross-plugin client (NXD-054).
 *
 * These tests exist because of a defect no existing test could have caught:
 * all four clients passed `onBehalfOf: {} as never` to `getPluginRequestToken`,
 * which throws, and every one of them swallowed the throw. The suites that
 * covered these files asserted on *parsed responses* with a mock `fetch`, so
 * they exercised the JSON handling and never the token call.
 *
 * So the assertions here are deliberately about the wiring rather than the
 * payload: that own-service credentials are requested, that they are what gets
 * passed as `onBehalfOf`, that the resulting token reaches the Authorization
 * header, and that a failure to mint one is reported rather than absorbed.
 */

import { createHttpUrsBaselineResolver } from './urs-baseline-resolver';
import { createHttpCatalogComponentLoader } from './catalog-component-loader';
import { createHttpValidationDecisionResolver } from './validation-decision-resolver';

const OWN_CREDENTIALS = {
  principal: { type: 'service', subject: 'plugin:composer' },
};

function fakeAuth() {
  return {
    getOwnServiceCredentials: jest.fn(async () => OWN_CREDENTIALS),
    getPluginRequestToken: jest.fn(async () => ({ token: 'minted-token' })),
  };
}

function throwingAuth() {
  return {
    getOwnServiceCredentials: jest.fn(async () => {
      throw new Error('no service identity available');
    }),
    getPluginRequestToken: jest.fn(async () => ({ token: 'unreachable' })),
  };
}

function fakeDiscovery(base = 'http://localhost:7007/api/plugin') {
  return { getBaseUrl: jest.fn(async () => base) };
}

function fakeLogger() {
  return { warn: jest.fn() };
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

/** The Authorization header of the Nth fetch call. */
function authHeaderOf(mockFetch: jest.Mock, call = 0): string | undefined {
  const init = mockFetch.mock.calls[call][1] as
    | { headers?: Record<string, string> }
    | undefined;
  return init?.headers?.Authorization;
}

describe('URS baseline resolver: cross-plugin call shape', () => {
  it('mints a token with its own service credentials and sends it', async () => {
    const auth = fakeAuth();
    const mockFetch = jest.fn(async () =>
      jsonResponse({ id: 'urs-1', status: 'APPROVED', baselineVersion: '1.0' }),
    );
    const resolver = createHttpUrsBaselineResolver({
      discovery: fakeDiscovery(),
      auth,
      logger: fakeLogger(),
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    await resolver.resolveApprovedBaseline('urs-1');

    expect(auth.getOwnServiceCredentials).toHaveBeenCalled();
    // The exact defect: this used to be `{}`, which throws inside Backstage.
    expect(auth.getPluginRequestToken).toHaveBeenCalledWith({
      onBehalfOf: OWN_CREDENTIALS,
      targetPluginId: 'urs-composer',
    });
    expect(authHeaderOf(mockFetch)).toBe('Bearer minted-token');
  });

  it('says so when it cannot mint a token, instead of failing silently', async () => {
    // Previously this path was a bare `catch {}`. The request then went out
    // unauthenticated, got a 401, and the gate reported the baseline as not
    // approved — a finding about the product for what was a broken call.
    const logger = fakeLogger();
    const mockFetch = jest.fn(async () => jsonResponse({}, 401));
    const resolver = createHttpUrsBaselineResolver({
      discovery: fakeDiscovery(),
      auth: throwingAuth(),
      logger,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    await expect(resolver.resolveApprovedBaseline('urs-1')).rejects.toThrow(
      /HTTP 401/,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not mint a service token for urs-composer'),
    );
    expect(authHeaderOf(mockFetch)).toBeUndefined();
  });
});

describe('Catalog component loader: cross-plugin call shape', () => {
  it('mints a token with its own service credentials and sends it', async () => {
    const auth = fakeAuth();
    const mockFetch = jest.fn(async () => jsonResponse([]));
    const loader = createHttpCatalogComponentLoader({
      discovery: fakeDiscovery(),
      auth,
      logger: fakeLogger(),
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    await loader.loadPlatformComponents();

    expect(auth.getOwnServiceCredentials).toHaveBeenCalled();
    expect(auth.getPluginRequestToken).toHaveBeenCalledWith({
      onBehalfOf: OWN_CREDENTIALS,
      targetPluginId: 'catalog',
    });
    expect(authHeaderOf(mockFetch)).toBe('Bearer minted-token');
  });

  it('logs why the component list is empty rather than just returning []', async () => {
    const logger = fakeLogger();
    const loader = createHttpCatalogComponentLoader({
      discovery: fakeDiscovery(),
      auth: fakeAuth(),
      logger,
      fetchImpl: (async () => jsonResponse({}, 500)) as unknown as typeof fetch,
    });

    expect(await loader.loadPlatformComponents()).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Catalog returned HTTP 500'),
    );
  });
});

describe('ValidationDecision resolver: cross-plugin call shape', () => {
  function contextsThenDecision(
    contextsBody: unknown,
    decisionBody: unknown,
    decisionStatus = 200,
  ) {
    let call = 0;
    return jest.fn(async () => {
      call += 1;
      return call === 1
        ? jsonResponse(contextsBody)
        : jsonResponse(decisionBody, decisionStatus);
    });
  }

  it('mints a token with its own service credentials and sends it', async () => {
    const auth = fakeAuth();
    const mockFetch = contextsThenDecision(
      { items: [{ id: 'ctx-1', source: { baselineId: 'urs-1' } }] },
      { status: 'APPROVED' },
    );
    const resolver = createHttpValidationDecisionResolver({
      discovery: fakeDiscovery(),
      auth,
      logger: fakeLogger(),
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    await resolver.hasApprovedDecision('urs-1');

    expect(auth.getOwnServiceCredentials).toHaveBeenCalled();
    expect(auth.getPluginRequestToken).toHaveBeenCalledWith({
      onBehalfOf: OWN_CREDENTIALS,
      targetPluginId: 'validation-expert',
    });
    expect(authHeaderOf(mockFetch)).toBe('Bearer minted-token');
  });

  it('reads the { items: [...] } envelope GET /contexts actually returns', async () => {
    // The second half of the defect. The body was typed as a bare array, so
    // `.find` threw on every call and the catch turned it into `false` — this
    // resolver could not return true under any circumstances.
    const resolver = createHttpValidationDecisionResolver({
      discovery: fakeDiscovery(),
      auth: fakeAuth(),
      logger: fakeLogger(),
      fetchImpl: contextsThenDecision(
        { items: [{ id: 'ctx-1', source: { baselineId: 'urs-1' } }] },
        { status: 'APPROVED' },
      ) as unknown as typeof fetch,
    });

    expect(await resolver.hasApprovedDecision('urs-1')).toBe(true);
  });

  it('still accepts a bare array, so the reader survives an envelope change', async () => {
    const resolver = createHttpValidationDecisionResolver({
      discovery: fakeDiscovery(),
      auth: fakeAuth(),
      logger: fakeLogger(),
      fetchImpl: contextsThenDecision(
        [{ id: 'ctx-1', source: { baselineId: 'urs-1' } }],
        { status: 'APPROVED' },
      ) as unknown as typeof fetch,
    });

    expect(await resolver.hasApprovedDecision('urs-1')).toBe(true);
  });

  it('returns false for a REJECTED decision', async () => {
    const resolver = createHttpValidationDecisionResolver({
      discovery: fakeDiscovery(),
      auth: fakeAuth(),
      logger: fakeLogger(),
      fetchImpl: contextsThenDecision(
        { items: [{ id: 'ctx-1', source: { baselineId: 'urs-1' } }] },
        { status: 'REJECTED' },
      ) as unknown as typeof fetch,
    });

    expect(await resolver.hasApprovedDecision('urs-1')).toBe(false);
  });

  it('does not warn on a 404 decision — that is a real "not yet approved"', async () => {
    const logger = fakeLogger();
    const resolver = createHttpValidationDecisionResolver({
      discovery: fakeDiscovery(),
      auth: fakeAuth(),
      logger,
      fetchImpl: contextsThenDecision(
        { items: [{ id: 'ctx-1', source: { baselineId: 'urs-1' } }] },
        {},
        404,
      ) as unknown as typeof fetch,
    });

    expect(await resolver.hasApprovedDecision('urs-1')).toBe(false);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns when the context list comes back completely empty', async () => {
    // Distinguishes "this baseline has no context" from "the plugin answered
    // with nothing", which is what a broken call looks like.
    const logger = fakeLogger();
    const resolver = createHttpValidationDecisionResolver({
      discovery: fakeDiscovery(),
      auth: fakeAuth(),
      logger,
      fetchImpl: (async () =>
        jsonResponse({ items: [] })) as unknown as typeof fetch,
    });

    expect(await resolver.hasApprovedDecision('urs-1')).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('no validation contexts at all'),
    );
  });
});
