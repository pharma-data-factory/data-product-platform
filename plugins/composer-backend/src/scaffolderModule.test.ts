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

import { AuthorizeResult } from '@backstage/plugin-permission-common';
import {
  createCatalogRegisterAction,
  createProductCreateAction,
  resolveCatalogInfoUrl,
  createUrsVerifyBaselineAction,
  UNBOUND,
} from './scaffolderModule';

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

/**
 * The action that joins the three halves of a product at birth.
 *
 * What these pin, in the order they matter:
 *
 *  - it authenticates as the person who started the task, not as this service.
 *    `POST /products` checks `product.create` against a *user* principal and
 *    refuses a service one, so getting this wrong means every template run ends
 *    in a 403 — and the repository would already exist by then;
 *  - it is idempotent on the entity ref, because scaffolder tasks are retried
 *    and a retry must not leave two governed records for one product;
 *  - it fails the task when the write fails, and says what the server said. A
 *    green task that produced two thirds of a product is the defect this whole
 *    step exists to close.
 */
describe('nexora:product:create', () => {
  const INITIATOR = {
    principal: { type: 'user', userEntityRef: 'user:default/dana' },
  };

  function productCtx(overrides: Record<string, unknown> = {}) {
    const output = jest.fn();
    return {
      input: {
        name: 'OEE Analytics',
        productType: 'DATA_PRODUCT',
        domain: 'manufacturing',
        description: 'Line OEE',
        repositoryUrl: 'https://github.com/acme/oee-analytics',
        catalogEntityRef: 'component:default/oee-analytics',
        ...overrides,
      },
      output,
      getInitiatorCredentials: jest.fn(async () => INITIATOR),
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    } as never as Parameters<
      ReturnType<typeof createProductCreateAction>['handler']
    >[0] & { output: jest.Mock; getInitiatorCredentials: jest.Mock };
  }

  /** Answers the lookup, then the create, in that order. */
  function fetchSequence(
    responses: Array<{ status: number; body?: unknown; text?: string }>,
  ) {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const impl = jest.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      const next = responses.shift() ?? { status: 500 };
      return {
        ok: next.status >= 200 && next.status < 300,
        status: next.status,
        json: async () => next.body,
        text: async () => next.text ?? JSON.stringify(next.body ?? {}),
      };
    });
    return { impl: impl as never as typeof fetch, calls };
  }

  const composerDiscovery = {
    getBaseUrl: jest.fn(async () => 'http://localhost:7007/api/composer'),
  };

  beforeEach(() => jest.clearAllMocks());

  it('creates the record and mints the token on behalf of the initiator', async () => {
    const { impl, calls } = fetchSequence([
      { status: 404 },
      { status: 201, body: { id: 'product-1' } },
    ]);
    const tokenAuth = {
      getPluginRequestToken: jest.fn(async () => ({ token: 'user-token' })),
    };

    const action = createProductCreateAction({
      discovery: composerDiscovery,
      auth: tokenAuth,
      fetchImpl: impl,
    });

    const c = productCtx();
    await action.handler(c);

    // The credential that was minted is the task initiator's, not this
    // plugin's own. A service principal is refused by POST /products.
    expect(c.getInitiatorCredentials).toHaveBeenCalled();
    expect(tokenAuth.getPluginRequestToken).toHaveBeenCalledWith({
      onBehalfOf: INITIATOR,
      targetPluginId: 'composer',
    });

    expect(calls[0].url).toContain(
      '/products/by-entity-ref?ref=component%3Adefault%2Foee-analytics',
    );
    expect(calls[1].url).toBe('http://localhost:7007/api/composer/products');
    expect(
      (calls[1].init?.headers as Record<string, string>).Authorization,
    ).toBe('Bearer user-token');

    const body = JSON.parse(String(calls[1].init?.body));
    expect(body.repositoryUrl).toBe('https://github.com/acme/oee-analytics');
    expect(body.catalogEntityRef).toBe('component:default/oee-analytics');

    expect(c.output).toHaveBeenCalledWith('productId', 'product-1');
    expect(c.output).toHaveBeenCalledWith('productUrl', '/products/product-1');
    expect(c.output).toHaveBeenCalledWith('created', true);
  });

  it('writes nothing when a product already claims the entity', async () => {
    const { impl, calls } = fetchSequence([
      { status: 200, body: { id: 'product-existing', name: 'OEE Analytics' } },
    ]);

    const action = createProductCreateAction({
      discovery: composerDiscovery,
      auth: { getPluginRequestToken: async () => ({ token: 't' }) },
      fetchImpl: impl,
    });

    const c = productCtx();
    await action.handler(c);

    // One call: the lookup. A retried task does not produce a twin.
    expect(calls).toHaveLength(1);
    expect(c.output).toHaveBeenCalledWith('productId', 'product-existing');
    expect(c.output).toHaveBeenCalledWith('created', false);
  });

  it('fails the task when the record cannot be written, and quotes the server', async () => {
    const { impl } = fetchSequence([
      { status: 404 },
      { status: 403, text: '{"error":"Unauthorized"}' },
    ]);

    const action = createProductCreateAction({
      discovery: composerDiscovery,
      auth: { getPluginRequestToken: async () => ({ token: 't' }) },
      fetchImpl: impl,
    });

    await expect(action.handler(productCtx())).rejects.toThrow(/403/);
  });

  it('refuses to create on top of a lookup it could not complete', async () => {
    // Not 404 and not 200: the lookup did not answer the question, so whether
    // the entity is claimed is unknown, and creating anyway is how duplicates
    // are made.
    const { impl, calls } = fetchSequence([{ status: 500, text: 'boom' }]);

    const action = createProductCreateAction({
      discovery: composerDiscovery,
      auth: { getPluginRequestToken: async () => ({ token: 't' }) },
      fetchImpl: impl,
    });

    await expect(action.handler(productCtx())).rejects.toThrow(
      /already claimed/,
    );
    expect(calls).toHaveLength(1);
  });

  it('refuses an empty entity ref rather than creating an unjoined record', async () => {
    const { impl, calls } = fetchSequence([]);

    const action = createProductCreateAction({
      discovery: composerDiscovery,
      auth: { getPluginRequestToken: async () => ({ token: 't' }) },
      fetchImpl: impl,
    });

    await expect(
      action.handler(productCtx({ catalogEntityRef: '  ' })),
    ).rejects.toThrow(/catalog:register/);
    expect(calls).toHaveLength(0);
  });
});

describe('nexora:catalog:register (NXD-118)', () => {
  const INITIATOR = {
    principal: { type: 'user', userEntityRef: 'user:default/dana' },
  };
  const SERVICE = {
    principal: { type: 'service', subject: 'plugin:scaffolder' },
  };
  const REPO = 'https://github.com/pharma-data-factory/oee-line-3/tree/main';

  const config = {
    getOptionalString: (key: string) =>
      ({
        'nexora.scm.host': 'github.com',
        'nexora.scm.organization': 'pharma-data-factory',
      }[key]),
  } as never;

  function registerCtx(input: Record<string, unknown>) {
    return {
      input: { catalogInfoPath: '/catalog-info.yaml', ...input },
      output: jest.fn(),
      getInitiatorCredentials: jest.fn(async () => INITIATOR),
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    } as never as Parameters<
      ReturnType<typeof createCatalogRegisterAction>['handler']
    >[0] & { output: jest.Mock };
  }

  function setup(
    decision: AuthorizeResult = AuthorizeResult.ALLOW,
    catalogRefuses = false,
  ) {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = jest.fn(
      async (url: string, init?: RequestInit): Promise<unknown> => {
        calls.push({ url: String(url), init });
        if (catalogRefuses) {
          return {
            ok: false,
            status: 400,
            text: async () =>
              'Malformed envelope, policy-version must be string',
          };
        }
        const dryRun = String(url).includes('dryRun=true');
        return {
          ok: true,
          status: 201,
          json: async () =>
            dryRun
              ? {
                  entities: [
                    { kind: 'Location', metadata: { name: 'generated-abc' } },
                    { kind: 'Component', metadata: { name: 'oee-line-3' } },
                  ],
                }
              : { location: {}, entities: [] },
          text: async () => '',
        };
      },
    ) as never as typeof fetch;
    const serviceAuth = {
      getOwnServiceCredentials: jest.fn(async () => SERVICE),
      getPluginRequestToken: jest.fn(async () => ({ token: 'service-token' })),
    };
    const permissions = {
      authorize: jest.fn(async () => [{ result: decision }]),
    };
    const action = createCatalogRegisterAction({
      config,
      discovery: {
        getBaseUrl: jest.fn(async () => 'http://localhost:7007/api/catalog'),
      },
      auth: serviceAuth,
      permissions,
      fetchImpl,
    });
    return { action, calls, serviceAuth, permissions };
  }

  it('registers a repository of the platform organisation with the service identity', async () => {
    const { action, calls, serviceAuth, permissions } = setup();
    const c = registerCtx({ repoContentsUrl: REPO });

    await action.handler(c);

    // Who: the initiator's own right to create entities.
    expect(permissions.authorize).toHaveBeenCalledWith(
      [
        {
          permission: expect.objectContaining({
            name: 'catalog.entity.create',
          }),
        },
      ],
      { credentials: INITIATOR },
    );
    // How: the location is added as this plugin, not as the initiator.
    expect(serviceAuth.getPluginRequestToken).toHaveBeenCalledWith({
      onBehalfOf: SERVICE,
      targetPluginId: 'catalog',
    });
    // Validated by a dry run before anything is registered.
    expect(calls.map(call => call.url)).toEqual([
      'http://localhost:7007/api/catalog/locations?dryRun=true',
      'http://localhost:7007/api/catalog/locations',
    ]);
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({
      type: 'url',
      target:
        'https://github.com/pharma-data-factory/oee-line-3/tree/main/catalog-info.yaml',
    });
    expect(c.output).toHaveBeenCalledWith(
      'entityRef',
      'component:default/oee-line-3',
    );
  });

  it('registers nothing when the Catalog refuses the descriptor', async () => {
    const { action, calls } = setup(AuthorizeResult.ALLOW, true);
    await expect(
      action.handler(registerCtx({ repoContentsUrl: REPO })),
    ).rejects.toThrow(/refuses .* so it was not registered: 400 Malformed/);
    expect(calls.map(call => call.url)).toEqual([
      'http://localhost:7007/api/catalog/locations?dryRun=true',
    ]);
  });

  it('refuses an initiator who may not create Catalog entities, before writing', async () => {
    const { action, calls } = setup(AuthorizeResult.DENY);
    await expect(
      action.handler(registerCtx({ repoContentsUrl: REPO })),
    ).rejects.toThrow(/catalog\.entity\.create/);
    expect(calls).toEqual([]);
  });

  it('refuses a repository outside the platform organisation, before writing', async () => {
    const { action, calls, permissions } = setup();
    await expect(
      action.handler(
        registerCtx({
          repoContentsUrl: 'https://github.com/someone-else/oee/tree/main',
        }),
      ),
    ).rejects.toThrow(/Only repositories in github.com\/pharma-data-factory/);
    expect(calls).toEqual([]);
    expect(permissions.authorize).not.toHaveBeenCalled();
  });

  it.each([
    ['another host', 'https://gitlab.com/pharma-data-factory/oee/tree/main'],
    ['plain http', 'http://github.com/pharma-data-factory/oee/tree/main'],
    ['no repository', 'https://github.com/pharma-data-factory'],
    ['a query', 'https://github.com/pharma-data-factory/oee?x=1'],
  ])('resolveCatalogInfoUrl refuses %s', (_label, repoContentsUrl) => {
    expect(() =>
      resolveCatalogInfoUrl({
        repoContentsUrl,
        catalogInfoPath: '/catalog-info.yaml',
        host: 'github.com',
        owner: 'pharma-data-factory',
      }),
    ).toThrow(/Only repositories in/);
  });

  it('resolveCatalogInfoUrl refuses a path that climbs out of the repository', () => {
    expect(() =>
      resolveCatalogInfoUrl({
        repoContentsUrl: REPO,
        catalogInfoPath: '/../../other-repo/catalog-info.yaml',
        host: 'github.com',
        owner: 'pharma-data-factory',
      }),
    ).toThrow(/Invalid catalogInfoPath/);
  });
});
