import { readFileSync } from 'fs';
import { join } from 'path';
/**
 * Artifact Registry HTTP surface.
 *
 * Built over a real repository on an in-memory SQLite database rather than a
 * fake, so these tests prove the wiring a caller actually hits: the router,
 * the service's rules, and the columns the transitions write. What they add
 * on top of service.test.ts is the part only the router owns — which
 * permission guards which route, and which status code each failure becomes.
 */

import express from 'express';
import knex, { Knex } from 'knex';
import { AuthenticationError, NotAllowedError } from '@backstage/errors';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { listenOnFetchablePort as listen } from '@internal/backend-test-utils';
import {
  ARTIFACT_MANIFEST_API_VERSION,
  type ArtifactVersion,
} from '@internal/platform-common';
import { ArtifactRegistryRepository } from './repository';
import { ArtifactRegistryService } from './service';
import { createRouter } from './router';

const actor = 'user:default/publisher';
/**
 * What a consuming installation's static `externalAccess` entry calls itself.
 * Named after the installation rather than the mechanism, because the subject
 * is what reaches durable storage and what T5's consumer registry will record.
 */
const SERVICE_SUBJECT = 'installation:plant-basel';

function manifest(version = '1.0') {
  return {
    apiVersion: ARTIFACT_MANIFEST_API_VERSION,
    kind: 'CONNECTOR',
    metadata: { namespace: 'acme', name: 'sap-odata', version },
  };
}

describe('Artifact Registry router', () => {
  let db: Knex;
  let service: ArtifactRegistryService;
  let server: { url: string; close: () => Promise<void> };
  /** Permission names the router actually asked about, in order. */
  let checked: string[];
  let decision: (typeof AuthorizeResult)['ALLOW' | 'DENY'];
  /**
   * Flipped per test to exercise the user / service / anonymous branches.
   *
   * The stub this replaced returned a fixed user and ignored `opts.allow`
   * entirely, so no test could present a service principal and no test could
   * reach the 401 path — the two things NXD-087 is about were both
   * inexpressible. `allow` is honoured here, and a disallowed kind throws the
   * error Backstage actually throws.
   */
  let principal: 'user' | 'service' | 'none';
  /** Every `opts` object the router passed to `httpAuth.credentials`. */
  let credentialRequests: Array<{
    allow?: string[];
    allowLimitedAccess?: boolean;
  }>;

  beforeEach(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.raw('select 1');
    const repository = await ArtifactRegistryRepository.create({
      getClient: () => db,
    });
    service = new ArtifactRegistryService(repository);
    checked = [];
    decision = AuthorizeResult.ALLOW;
    principal = 'user';
    credentialRequests = [];

    const router = await createRouter({
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as never,
      httpAuth: {
        credentials: async (
          _req: unknown,
          opts?: { allow?: string[]; allowLimitedAccess?: boolean },
        ) => {
          credentialRequests.push(opts ?? {});
          const allow = opts?.allow ?? [];
          if (principal === 'none' || !allow.includes(principal)) {
            // The real httpAuth distinguishes these two, and so does
            // respondError: a caller presenting nothing is unauthenticated
            // (401), a caller presenting the wrong *kind* of credential is
            // refused (403). Collapsing them here would have let the route
            // tests agree with a router that answered either one.
            throw principal === 'none'
              ? new AuthenticationError('No credentials presented')
              : new NotAllowedError(
                  `This endpoint does not allow '${principal}' credentials`,
                );
          }
          return principal === 'service'
            ? { principal: { type: 'service', subject: SERVICE_SUBJECT } }
            : { principal: { type: 'user', userEntityRef: actor } };
        },
      } as never,
      permissions: {
        authorize: async (queries: Array<{ permission: { name: string } }>) => {
          checked.push(...queries.map(query => query.permission.name));
          return queries.map(query => ({
            permission: query.permission,
            result: decision,
          }));
        },
      } as never,
      service,
    });

    const app = express();
    app.use(router);
    server = await listen(app);
  });

  afterEach(async () => {
    await server?.close();
    await db?.destroy();
  });

  function request(path: string, method: 'GET' | 'POST' = 'GET', body?: unknown) {
    return fetch(`${server.url}${path}`, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
    });
  }

  /** Registers acme/sap-odata@1.0 out of band and returns the version id. */
  async function seedVersion(): Promise<string> {
    await service.createPublisher(
      { namespace: 'acme', displayName: 'Acme Industrial' },
      actor,
    );
    const { version } = await service.registerArtifactVersion(
      manifest(),
      actor,
    );
    return version.id;
  }

  describe('health', () => {
    it('answers without any permission check', async () => {
      const response = await request('/health');

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        status: 'ok',
        service: 'artifact-registry',
      });
      // The plugin marks /health unauthenticated; a permission check here
      // would mean liveness probes need credentials.
      expect(checked).toEqual([]);
    });
  });

  describe('permission gating', () => {
    // Each route must ask for the permission that names the act it performs.
    // Asserting the captured name, not just the 403, is what stops a
    // copy-paste from guarding `deprecate` with `artifact.submit`.
    const routes: Array<[string, string, 'GET' | 'POST', string]> = [
      ['create a publisher', '/publishers', 'POST', 'publisher.manage'],
      ['list publishers', '/publishers', 'GET', 'artifact.read'],
      ['register a version', '/artifacts', 'POST', 'artifact.create'],
      ['list artifacts', '/artifacts', 'GET', 'artifact.read'],
      ['get an artifact', '/artifacts/acme/sap-odata', 'GET', 'artifact.read'],
      [
        'list versions',
        '/artifacts/acme/sap-odata/versions',
        'GET',
        'artifact.read',
      ],
      [
        'resolve a version',
        '/artifacts/acme/sap-odata/versions/1.0',
        'GET',
        'artifact.read',
      ],
      ['submit', '/artifact-versions/some-id/submit', 'POST', 'artifact.submit'],
      ['review', '/artifact-versions/some-id/review', 'POST', 'artifact.review'],
      [
        'certify',
        '/artifact-versions/some-id/certify',
        'POST',
        'artifact.certify',
      ],
      [
        'publish',
        '/artifact-versions/some-id/publish',
        'POST',
        'artifact.publish',
      ],
      [
        'deprecate',
        '/artifact-versions/some-id/deprecate',
        'POST',
        'artifact.deprecate',
      ],
    ];

    it.each(routes)(
      'gates %s behind %s',
      async (_label, path, method, permission) => {
        decision = AuthorizeResult.DENY;

        const response = await request(path, method, method === 'POST' ? {} : undefined);

        expect(response.status).toBe(403);
        expect(checked).toEqual([permission]);
      },
    );

    it('refuses every guarded route when no permission service is wired', async () => {
      // Misconfiguration must fail closed. Returning 500 rather than 403 is
      // deliberate: nobody is forbidden, the platform simply cannot say.
      const router = await createRouter({
        logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as never,
        // A real principal, not `{}`. Once the read routes branch on
        // `principal.type`, an empty object makes this route throw a
        // TypeError — which is also a 500, so the assertion below would keep
        // passing while testing something else entirely.
        httpAuth: {
          credentials: async () => ({
            principal: { type: 'user', userEntityRef: actor },
          }),
        } as never,
        permissions: undefined,
        service,
      });
      const app = express();
      app.use(router);
      const unguarded = await listen(app);
      try {
        const response = await fetch(`${unguarded.url}/publishers`);
        expect(response.status).toBe(500);
      } finally {
        await unguarded.close();
      }
    });
  });

  describe('a consuming installation reads as a service principal', () => {
    /**
     * T3 / NXD-087. A downstream Nexora installation presents a static
     * `backend.auth.externalAccess` token, which Backstage resolves to a
     * service principal. Before this, every one of these routes refused it,
     * so federation could not read a single field — the merge logic behind
     * `?includeFederated=true` had never once been reached over a network.
     */
    const readRoutes: Array<[string, string]> = [
      ['its own identity', '/installation'],
      ['the publisher list', '/publishers'],
      ['the artifact list', '/artifacts'],
      ['one artifact', '/artifacts/acme/sap-odata'],
      ['the version list', '/artifacts/acme/sap-odata/versions'],
      ['one version', '/artifacts/acme/sap-odata/versions/1.0'],
    ];

    beforeEach(async () => {
      await seedVersion();
    });

    it.each(readRoutes)('serves %s', async (_label, path) => {
      principal = 'service';

      const response = await request(path);

      expect(response.status).toBe(200);
      // Possession of the token IS the authorization. A service principal
      // carries no catalog identity, so there is no PlatformRole to resolve
      // and the permission framework must not be consulted at all. This
      // assertion, not the 200, is the one that catches a later author
      // "tidying up" by routing a service through `authorize`.
      expect(checked).toEqual([]);
    });

    it.each(readRoutes)('asks for both kinds of principal on %s', async (_label, path) => {
      principal = 'service';

      await request(path);

      expect(credentialRequests).toContainEqual({
        allow: ['user', 'service'],
      });
    });

    it.each(readRoutes)('answers 401 for %s with no credentials', async (_label, path) => {
      principal = 'none';

      const response = await request(path);

      expect(response.status).toBe(401);
    });

    it.each(readRoutes)('still gates %s for a denied user', async (_label, path) => {
      principal = 'user';
      decision = AuthorizeResult.DENY;

      const response = await request(path);

      // Widening to service principals must not widen anything for people.
      expect(response.status).toBe(403);
      expect(checked).toEqual(['artifact.read']);
    });

    it('resolves policies for a service principal', async () => {
      // The route the helper was originally written for (closure Slice 3),
      // which had no test of any kind until now.
      principal = 'service';

      const response = await request('/policies/resolve', 'POST', {
        policies: [],
      });

      expect(response.status).toBe(200);
      expect(checked).toEqual([]);
    });

    it('admits no service principal to any write route', async () => {
      // A consuming installation reads. The asymmetry is the whole design:
      // widening reads says nothing about writes, and this pins that it
      // stays that way.
      principal = 'service';

      const writes: Array<[string, unknown]> = [
        ['/publishers', { namespace: 'other', displayName: 'Other' }],
        ['/artifacts', manifest('2.0')],
        ['/artifact-versions/some-id/submit', {}],
        ['/artifact-versions/some-id/publish', {}],
      ];

      for (const [path, body] of writes) {
        const response = await request(path, 'POST', body);
        expect([path, response.status]).toEqual([path, 403]);
      }
    });
  });

  describe('the lifecycle walk', () => {
    it('carries a version from registration to deprecation', async () => {
      const created = await request('/publishers', 'POST', {
        namespace: 'acme',
        displayName: 'Acme Industrial',
      });
      expect(created.status).toBe(201);

      const registered = await request('/artifacts', 'POST', manifest());
      expect(registered.status).toBe(201);
      const { version, artifactCreated } = (await registered.json()) as {
        version: ArtifactVersion;
        artifactCreated: boolean;
      };
      expect(artifactCreated).toBe(true);
      // Registering content must never publish it.
      expect(version.lifecycle).toBe('DRAFT');

      const steps: Array<[string, string, string | undefined]> = [
        ['submit', 'TESTING', undefined],
        // Review records evidence without moving the lifecycle.
        ['review', 'TESTING', 'TESTED'],
        ['certify', 'CERTIFIED', 'CERTIFIED'],
        ['publish', 'RELEASED', 'CERTIFIED'],
        ['deprecate', 'DEPRECATED', 'CERTIFIED'],
      ];

      for (const [act, lifecycle, certificationStatus] of steps) {
        const response = await request(
          `/artifact-versions/${version.id}/${act}`,
          'POST',
        );
        expect([act, response.status]).toEqual([act, 200]);
        const body = (await response.json()) as ArtifactVersion;
        expect([act, body.lifecycle]).toEqual([act, lifecycle]);
        expect([act, body.certificationStatus]).toEqual([
          act,
          certificationStatus,
        ]);

        // The response must reflect what was stored, not just what was
        // computed in memory.
        const stored = await service.getArtifactVersionById(version.id);
        expect([act, stored?.lifecycle]).toEqual([act, lifecycle]);
        expect([act, stored?.certificationStatus]).toEqual([
          act,
          certificationStatus,
        ]);
      }
    });

    it('refuses to certify a version nobody reviewed', async () => {
      const id = await seedVersion();
      await request(`/artifact-versions/${id}/submit`, 'POST');

      const response = await request(
        `/artifact-versions/${id}/certify`,
        'POST',
      );

      expect(response.status).toBe(409);
      expect((await response.json()).error).toMatch(/must be TESTED/);
      const stored = await service.getArtifactVersionById(id);
      expect(stored?.lifecycle).toBe('TESTING');
    });

    it('refuses a transition taken out of order', async () => {
      const id = await seedVersion();

      const response = await request(
        `/artifact-versions/${id}/publish`,
        'POST',
      );

      expect(response.status).toBe(409);
      expect((await response.json()).error).toMatch(
        /lifecycle is DRAFT, must be CERTIFIED/,
      );
    });

    it('reports an unknown version id as 404 on every transition', async () => {
      for (const act of ['submit', 'review', 'certify', 'publish', 'deprecate']) {
        const response = await request(
          `/artifact-versions/does-not-exist/${act}`,
          'POST',
        );
        expect([act, response.status]).toEqual([act, 404]);
      }
    });
  });

  describe('reads', () => {
    it('reports an unregistered coordinate as 404, not an empty result', async () => {
      const artifact = await request('/artifacts/acme/nothing-here');
      expect(artifact.status).toBe(404);

      const versions = await request('/artifacts/acme/nothing-here/versions');
      expect(versions.status).toBe(404);

      const resolved = await request('/artifacts/acme/nothing-here/versions/1.0');
      expect(resolved.status).toBe(404);
    });

    it('lists versions of a registered artifact', async () => {
      await seedVersion();
      await service.registerArtifactVersion(manifest('1.1'), actor);

      const response = await request('/artifacts/acme/sap-odata/versions');

      expect(response.status).toBe(200);
      const body = (await response.json()) as ArtifactVersion[];
      expect(body.map(v => v.version)).toEqual(['1.0', '1.1']);
    });

    it('filters artifacts by namespace and rejects an unknown kind', async () => {
      await seedVersion();

      const matching = await request('/artifacts?namespace=acme');
      expect((await matching.json()).length).toBe(1);

      const other = await request('/artifacts?namespace=nobody');
      expect((await other.json()).length).toBe(0);

      // An unknown kind silently filtering to nothing would read as "no such
      // artifacts" when the caller in fact asked for a kind that cannot exist.
      const bogus = await request('/artifacts?kind=NOT_A_KIND');
      expect(bogus.status).toBe(400);
    });

    it('omits versions unless the caller asks for them', async () => {
      await seedVersion();

      const response = await request('/artifacts');

      expect(response.status).toBe(200);
      const body = (await response.json()) as Record<string, unknown>[];
      expect(body).toHaveLength(1);
      expect(body[0]).not.toHaveProperty('versions');
    });

    it('embeds versions and manifests on request', async () => {
      // A consumer needing every manifest — the Marketplace is the first —
      // would otherwise turn one catalogue page into N+1 round trips.
      await seedVersion();
      await service.registerArtifactVersion(manifest('1.1'), actor);

      const response = await request('/artifacts?includeVersions=true');

      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        name: string;
        versions: { version: string; lifecycle: string; manifest?: unknown }[];
      }[];
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe('sap-odata');
      expect(body[0].versions.map(v => v.version)).toEqual(['1.0', '1.1']);
      expect(body[0].versions.every(v => v.lifecycle === 'DRAFT')).toBe(true);
      expect(body[0].versions[0].manifest).toBeDefined();
    });

    it('still requires artifact.read to embed versions', async () => {
      // The expanded shape carries every manifest, so it must not be a way
      // around the permission the plain listing is behind.
      await seedVersion();
      decision = AuthorizeResult.DENY;

      const response = await request('/artifacts?includeVersions=true');

      expect(response.status).toBe(403);
      expect(checked).toContain('artifact.read');
    });
  });

  describe('registration errors', () => {
    it('reports an unclaimed namespace as 404', async () => {
      const response = await request('/artifacts', 'POST', manifest());

      expect(response.status).toBe(404);
      expect((await response.json()).error).toMatch(/No publisher owns/);
    });

    it('reports an invalid manifest as 400', async () => {
      await service.createPublisher(
        { namespace: 'acme', displayName: 'Acme Industrial' },
        actor,
      );

      const response = await request('/artifacts', 'POST', { kind: 'NONSENSE' });

      expect(response.status).toBe(400);
    });

    it('reports a re-registered coordinate as 409', async () => {
      await seedVersion();

      const response = await request('/artifacts', 'POST', manifest());

      expect(response.status).toBe(409);
      expect((await response.json()).error).toMatch(/already registered/);
    });
  });

  describe('POST /artifacts/release-builds (NXD-137)', () => {
    const body = {
      manifest: readFileSync(
        join(__dirname, '__fixtures__', 'oee-e2e-test-20261005-d.nexora.yaml'),
        'utf8',
      ),
      release: {
        imageRepository: 'ghcr.io/pharma-data-factory/oee-e2e-test-20261005-d',
        imageDigest:
          'sha256:6e696d5fc0b22f352bd5980c906f34d3af9c72e9a34ba70adc99453f752fd810',
        commitSha: '431fd71d0fcb5c9c56773f58fb451435db8f1c87',
      },
    };

    beforeEach(async () => {
      await service.createPublisher(
        { namespace: 'pharma-data-factory', displayName: 'Pharma Data Factory' },
        actor,
      );
    });

    it('creates the version, then answers the same build with 200', async () => {
      const created = await request('/artifacts/release-builds', 'POST', body);
      expect(created.status).toBe(201);
      expect(await created.json()).toMatchObject({
        alreadyRegistered: false,
        version: { version: '1.0.0', lifecycle: 'DRAFT', releaseBuild: body.release },
      });
      const again = await request('/artifacts/release-builds', 'POST', body);
      expect(again.status).toBe(200);
      expect((await again.json()).alreadyRegistered).toBe(true);
      expect(checked).toContain('artifact.create');
    });

    it('refuses a person without artifact.create', async () => {
      decision = AuthorizeResult.DENY;
      expect((await request('/artifacts/release-builds', 'POST', body)).status).toBe(403);
    });
  });
});
