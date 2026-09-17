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
import { AddressInfo } from 'net';
import knex, { Knex } from 'knex';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import {
  ARTIFACT_MANIFEST_API_VERSION,
  type ArtifactVersion,
} from '@internal/platform-common';
import { ArtifactRegistryRepository } from './repository';
import { ArtifactRegistryService } from './service';
import { createRouter } from './router';

const actor = 'user:default/publisher';

function manifest(version = '1.0') {
  return {
    apiVersion: ARTIFACT_MANIFEST_API_VERSION,
    kind: 'CONNECTOR',
    metadata: { namespace: 'acme', name: 'sap-odata', version },
  };
}

/**
 * Ports the Fetch standard refuses to connect to, restricted to those an
 * unprivileged `listen(0)` can actually be handed.
 *
 * `fetch` rejects these before opening a socket, with `TypeError: fetch
 * failed` and cause `bad port`. That is normally unreachable, because the
 * usual Linux ephemeral range starts at 32768 — but this container's
 * `ip_local_port_range` is `1024 65535`, so `app.listen(0)` can hand back one
 * of these and the request fails for reasons that have nothing to do with the
 * test. Rebinding is the entire fix. See NXD-017.
 *
 * https://fetch.spec.whatwg.org/#bad-port-blocklist
 */
const FETCH_BLOCKED_PORTS = new Set([
  1719, 1720, 1723, 2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566, 6665, 6666,
  6667, 6668, 6669, 6679, 6697, 10080,
]);

async function listen(app: express.Express) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve =>
      server.once('listening', () => resolve()),
    );
    const { port } = server.address() as AddressInfo;

    if (FETCH_BLOCKED_PORTS.has(port)) {
      await new Promise<void>(resolve => server.close(() => resolve()));
      continue;
    }

    return {
      url: `http://127.0.0.1:${port}`,
      close: () =>
        new Promise<void>((resolve, reject) =>
          server.close(error => (error ? reject(error) : resolve())),
        ),
    };
  }
  throw new Error(
    'Could not bind a port that fetch will connect to after 20 attempts.',
  );
}

describe('Artifact Registry router', () => {
  let db: Knex;
  let service: ArtifactRegistryService;
  let server: { url: string; close: () => Promise<void> };
  /** Permission names the router actually asked about, in order. */
  let checked: string[];
  let decision: (typeof AuthorizeResult)['ALLOW' | 'DENY'];

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

    const router = await createRouter({
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as never,
      httpAuth: {
        credentials: async () => ({
          principal: { type: 'user', userEntityRef: actor },
        }),
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
        httpAuth: { credentials: async () => ({}) } as never,
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
});
