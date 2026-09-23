/**
 * URS baseline resolver — the cross-plugin read the Product Composer binds on.
 *
 * The suite exists mainly for one behaviour change made in Slice 1a: a
 * requirement list that resolves only partially now rejects instead of
 * returning the short list with a warning. The old behaviour was safe for
 * nobody — a caller cannot tell a short list from a short baseline.
 */

import { createHttpUrsBaselineResolver } from './urs-baseline-resolver';

const logger = { warn: jest.fn() };

const auth = {
  getOwnServiceCredentials: jest.fn(async () => ({ token: 'own' })),
  getPluginRequestToken: jest.fn(async () => ({ token: 'minted' })),
};

const discovery = {
  getBaseUrl: jest.fn(async () => 'http://urs.test'),
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const APPROVED_BASELINE = {
  id: 'b1',
  status: 'APPROVED',
  baselineVersion: '2.0',
  requirementSetId: 'set-1',
  requirementVersionIds: ['rv-1', 'rv-2'],
};

function requirementVersion(id: string, ref: string) {
  return {
    id,
    requirementId: ref,
    title: `Title ${ref}`,
    statement: `Statement ${ref}`,
    category: 'Functional',
    priority: 'MUST',
    gxpRelevance: 'DIRECT',
    versionLabel: '2.0',
    contentHash: `sha256:${id}`,
  };
}

function resolverOver(handler: (url: string) => Response) {
  return createHttpUrsBaselineResolver({
    discovery,
    auth,
    logger,
    fetchImpl: (async (url: string) => handler(String(url))) as any,
  });
}

beforeEach(() => {
  logger.warn.mockClear();
});

describe('resolveBaselineContext', () => {
  it('carries the fields the product snapshot needs', async () => {
    const resolver = resolverOver(url => {
      if (url.endsWith('/baselines/b1')) {
        return jsonResponse(APPROVED_BASELINE);
      }
      if (url.endsWith('/requirement-sets/set-1')) {
        return jsonResponse({ solutionName: 'Basel Line OEE' });
      }
      if (url.endsWith('/requirement-versions/rv-1')) {
        return jsonResponse(requirementVersion('rv-1', 'URS-OEE-014'));
      }
      return jsonResponse(requirementVersion('rv-2', 'URS-OEE-015'));
    });

    const context = await resolver.resolveBaselineContext('b1');

    expect(context.requirements).toHaveLength(2);
    // requirementRef, gxpRelevance and contentHash were dropped before Slice
    // 1a. The snapshot cannot be written without the first, cannot be
    // risk-tiered without the second, and cannot prove which wording was
    // tested without the third.
    expect(context.requirements[0]).toMatchObject({
      id: 'rv-1',
      requirementRef: 'URS-OEE-014',
      gxpRelevance: 'DIRECT',
      versionLabel: '2.0',
      contentHash: 'sha256:rv-1',
    });
  });

  it('falls back to `version` when the URS side sends no versionLabel', async () => {
    const resolver = resolverOver(url => {
      if (url.endsWith('/baselines/b1')) {
        return jsonResponse({ ...APPROVED_BASELINE, requirementVersionIds: ['rv-1'] });
      }
      if (url.includes('/requirement-sets/')) {
        return jsonResponse({});
      }
      return jsonResponse({
        id: 'rv-1',
        requirementId: 'URS-OEE-014',
        title: 'T',
        statement: 'S',
        version: '1.3',
      });
    });

    const context = await resolver.resolveBaselineContext('b1');
    expect(context.requirements[0].versionLabel).toBe('1.3');
  });

  it('rejects rather than returning a partial requirement list', async () => {
    const resolver = resolverOver(url => {
      if (url.endsWith('/baselines/b1')) {
        return jsonResponse(APPROVED_BASELINE);
      }
      if (url.includes('/requirement-sets/')) {
        return jsonResponse({});
      }
      if (url.endsWith('/requirement-versions/rv-1')) {
        return jsonResponse(requirementVersion('rv-1', 'URS-OEE-014'));
      }
      return jsonResponse({ error: 'gone' }, 500);
    });

    await expect(resolver.resolveBaselineContext('b1')).rejects.toThrow(
      /1 of 2 requirement versions were readable/,
    );
    // The warning still fires: it names which one was missing, which the
    // thrown message does not.
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('rv-2'),
    );
  });

  it('rejects a baseline that is not APPROVED before reading any requirement', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({ ...APPROVED_BASELINE, status: 'DRAFT' }),
    );
    const resolver = createHttpUrsBaselineResolver({
      discovery,
      auth,
      logger,
      fetchImpl: fetchImpl as any,
    });

    await expect(resolver.resolveBaselineContext('b1')).rejects.toThrow(
      /is DRAFT; expected APPROVED/,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('still tolerates a missing requirement set — that enrichment is optional', async () => {
    // The set supplies the solution name and business capabilities, none of
    // which the binding depends on. Losing them degrades the context; losing
    // a requirement corrupts it. Only the second is fatal.
    const resolver = resolverOver(url => {
      if (url.endsWith('/baselines/b1')) {
        return jsonResponse({ ...APPROVED_BASELINE, requirementVersionIds: ['rv-1'] });
      }
      if (url.includes('/requirement-sets/')) {
        return jsonResponse({ error: 'not found' }, 404);
      }
      return jsonResponse(requirementVersion('rv-1', 'URS-OEE-014'));
    });

    const context = await resolver.resolveBaselineContext('b1');
    expect(context.solutionName).toBeUndefined();
    expect(context.requirements).toHaveLength(1);
  });

  it('returns an empty list without complaint for a baseline that pins nothing', async () => {
    // Zero of zero is complete, not partial.
    const resolver = resolverOver(url =>
      url.endsWith('/baselines/b1')
        ? jsonResponse({ ...APPROVED_BASELINE, requirementVersionIds: [] })
        : jsonResponse({}),
    );

    const context = await resolver.resolveBaselineContext('b1');
    expect(context.requirements).toEqual([]);
  });
});
