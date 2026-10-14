/**
 * Installations HTTP surface (NXD-139): which permission guards which route,
 * which status each refusal becomes, that the caller's own credentials reach
 * the registry, the classifier and the PIN check; that no person's route
 * admits a service principal, and that the provider routes admit only the
 * service principal bound to the target (NXD-143).
 */

import express from 'express';
import type { Knex } from 'knex';
import { AuthenticationError, NotAllowedError } from '@backstage/errors';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { listenOnFetchablePort as listen } from '@internal/backend-test-utils';
import {
  DIGEST_1,
  OPERATOR,
  RIGHT_PIN,
  fakeWorld,
  sqliteRepository,
} from './__testUtils__/fixtures';
import { createRouter } from './router';
import { InstallationsService } from './service';

const GMP_SIGNATURE = { justification: 'Go-live CC-118.', pin: RIGHT_PIN };

describe('installations router', () => {
  let db: Knex;
  let server: { url: string; close: () => Promise<void> };
  let world: ReturnType<typeof fakeWorld>;
  let checked: string[];
  let denied: Set<string>;
  let principal: 'user' | 'service' | 'none';
  /** The externalAccess subject a service principal presents. */
  let serviceSubject: string;
  /** The credentials each client was handed. */
  let handedCredentials: unknown[];

  beforeEach(async () => {
    const created = await sqliteRepository();
    db = created.db;
    world = fakeWorld();
    checked = [];
    denied = new Set();
    principal = 'user';
    serviceSubject = 'provider:basel';
    handedCredentials = [];

    const router = await createRouter({
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as never,
      httpAuth: {
        credentials: async (_req: unknown, opts?: { allow?: string[] }) => {
          const allow = opts?.allow ?? [];
          if (principal === 'none' || !allow.includes(principal)) {
            throw principal === 'none'
              ? new AuthenticationError('No credentials presented')
              : new NotAllowedError(`This endpoint does not allow '${principal}' credentials`);
          }
          return principal === 'service'
            ? { principal: { type: 'service', subject: serviceSubject } }
            : { principal: { type: 'user', userEntityRef: OPERATOR } };
        },
      } as never,
      permissions: {
        authorize: async (queries: Array<{ permission: { name: string } }>) => {
          checked.push(...queries.map(q => q.permission.name));
          return queries.map(q => ({
            result: denied.has(q.permission.name) ? AuthorizeResult.DENY : AuthorizeResult.ALLOW,
          }));
        },
      } as never,
      service: new InstallationsService(created.repository),
      readArtifactVersion: async (credentials, coordinate) => {
        handedCredentials.push(credentials);
        return world.readVersion(coordinate);
      },
      classify: async (credentials, artifact) => {
        handedCredentials.push(credentials);
        return world.classify(artifact);
      },
      pinVerifier: async (credentials, pin) => {
        handedCredentials.push(credentials);
        return world.verifyPin(pin);
      },
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
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
  }

  async function target(): Promise<string> {
    const response = await request('/targets', 'POST', {
      name: 'basel-line-3',
      providerKind: 'docker-compose',
      providerSubject: 'provider:basel',
    });
    expect(response.status).toBe(201);
    return ((await response.json()) as { id: string }).id;
  }

  async function installed(targetId: string): Promise<string> {
    const response = await request('/installations', 'POST', {
      targetId,
      artifactRef: 'pharma/oee@1.0.0',
      config: { EQUIPMENT_ID: 'filler-01' },
      signature: GMP_SIGNATURE,
    });
    expect(response.status).toBe(201);
    return ((await response.json()) as { id: string }).id;
  }

  it('registers a target under installation.target.manage, and reads under installation.read', async () => {
    const id = await target();
    expect(checked).toEqual(['installation.target.manage']);
    const list = await request('/targets');
    expect(list.status).toBe(200);
    expect(((await list.json()) as { items: unknown[] }).items).toHaveLength(1);
    expect((await request(`/targets/${id}`)).status).toBe(200);
    expect((await request('/targets/nope')).status).toBe(404);
    expect(checked.slice(1)).toEqual(['installation.read', 'installation.read', 'installation.read']);
  });

  it('changes registry credentials under installation.target.manage only (NXD-147)', async () => {
    const id = await target();
    const put = (body: unknown) =>
      fetch(`${server.url}/targets/${id}/registry-credentials`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    const ok = await put({ registryCredentials: [{ registry: 'ghcr.io', secretRef: 'ghcr/pull-token' }] });
    expect(ok.status).toBe(200);
    expect(checked.slice(-1)).toEqual(['installation.target.manage']);
    expect((await put({ registryCredentials: [{ registry: 'ghcr.io', password: 'x', secretRef: 'a' }] })).status).toBe(400);
    denied.add('installation.target.manage');
    expect((await put({ registryCredentials: [] })).status).toBe(403);
    principal = 'service';
    denied.clear();
    expect((await put({ registryCredentials: [] })).status).toBe(403);
  });

  it('refuses a target to someone without installation.target.manage', async () => {
    denied.add('installation.target.manage');
    const response = await request('/targets', 'POST', { name: 'x', providerKind: 'docker-compose' });
    expect(response.status).toBe(403);
  });

  it('installs, upgrades and removes under installation.manage, with the caller’s credentials', async () => {
    const targetId = await target();
    const id = await installed(targetId);
    const upgrade = await request(`/installations/${id}/upgrade`, 'POST', {
      version: '1.1.0',
      signature: GMP_SIGNATURE,
    });
    expect(upgrade.status).toBe(200);
    expect(((await upgrade.json()) as { desired: { artifactRef: string } }).desired.artifactRef).toBe(
      'pharma/oee@1.1.0',
    );
    const remove = await request(`/installations/${id}/remove`, 'POST', { signature: GMP_SIGNATURE });
    expect(remove.status).toBe(200);
    expect(checked.filter(name => name === 'installation.manage')).toHaveLength(3);
    // Registry read, classification and PIN, for three acts (remove reads no version).
    expect(handedCredentials).toHaveLength(8);
    for (const credentials of handedCredentials) {
      expect(credentials).toEqual({ principal: { type: 'user', userEntityRef: OPERATOR } });
    }

    const acts = await request(`/installations/${id}/acts`);
    expect(((await acts.json()) as { items: Array<{ act: string }> }).items.map(a => a.act)).toEqual([
      'INSTALL',
      'UPGRADE',
      'REMOVE',
    ]);
    const audit = await request(`/installations/${id}/audit`);
    expect(((await audit.json()) as { items: unknown[] }).items).toHaveLength(3);
    const iq = await request(`/installations/${id}/qualifications`);
    expect(((await iq.json()) as { items: unknown[] }).items).toHaveLength(2);
    const list = await request(`/installations?targetId=${targetId}`);
    expect(((await list.json()) as { items: unknown[] }).items).toHaveLength(1);
  });

  it('refuses an act without installation.manage before asking any other plugin', async () => {
    const targetId = await target();
    denied.add('installation.manage');
    const response = await request('/installations', 'POST', {
      targetId,
      artifactRef: 'pharma/oee@1.0.0',
      config: { EQUIPMENT_ID: 'f' },
      signature: GMP_SIGNATURE,
    });
    expect(response.status).toBe(403);
    expect(handedCredentials).toEqual([]);
  });

  it('answers each refusal with its own status', async () => {
    const targetId = await target();
    const post = (body: Record<string, unknown>) =>
      request('/installations', 'POST', {
        targetId,
        artifactRef: 'pharma/oee@1.0.0',
        config: { EQUIPMENT_ID: 'f' },
        signature: GMP_SIGNATURE,
        ...body,
      });
    // Not released: the request conflicts with the registry's state.
    expect((await post({ artifactRef: 'pharma/oee@2.0.0' })).status).toBe(409);
    // A literal secret, a missing PIN: correctable input.
    expect((await post({ config: { EQUIPMENT_ID: 'f', MQTT_PASSWORD: 'literal' } })).status).toBe(400);
    expect((await post({ signature: { justification: 'x' } })).status).toBe(400);
    // A wrong PIN: refused.
    const wrong = await post({ signature: { justification: 'x', pin: 'wrong' } });
    expect(wrong.status).toBe(403);
    expect(((await wrong.json()) as { error: string }).error).toMatch(/Signature rejected/);
    // Unknown version and unknown installation.
    expect((await post({ artifactRef: 'pharma/oee@9.9.9' })).status).toBe(404);
    expect((await request('/installations/nope')).status).toBe(404);
  });

  it('admits no service principal on any person’s route', async () => {
    const targetId = await target();
    const id = await installed(targetId);
    principal = 'service';
    for (const [path, method] of [
      ['/targets', 'GET'],
      ['/targets', 'POST'],
      [`/targets/${targetId}`, 'GET'],
      ['/installations', 'GET'],
      ['/installations', 'POST'],
      [`/installations/${id}`, 'GET'],
      [`/installations/${id}/upgrade`, 'POST'],
      [`/installations/${id}/remove`, 'POST'],
      [`/installations/${id}/acts`, 'GET'],
      [`/installations/${id}/audit`, 'GET'],
      [`/installations/${id}/qualifications`, 'GET'],
      ['/artifacts/pharma/oee/gmp-classification', 'GET'],
    ] as const) {
      const response = await request(path, method, method === 'POST' ? {} : undefined);
      expect([method, path, response.status]).toEqual([method, path, 403]);
    }
    principal = 'none';
    expect((await request('/installations')).status).toBe(401);
  });

  describe('the provider routes (NXD-143)', () => {
    function report(targetId: string, id: string, body: unknown) {
      return request(`/provider/targets/${targetId}/installations/${id}/observed`, 'POST', body);
    }

    it('admit only the service principal bound to the target', async () => {
      const targetId = await target();
      const id = await installed(targetId);
      const unbound = await request('/targets', 'POST', { name: 'unbound', providerKind: 'docker-compose' });
      const unboundId = ((await unbound.json()) as { id: string }).id;
      const running = { state: 'RUNNING', desiredRevision: 1 };

      // A person, however permitted, is not a provider.
      expect((await request(`/provider/targets/${targetId}/desired`)).status).toBe(403);
      expect((await report(targetId, id, running)).status).toBe(403);

      principal = 'service';
      serviceSubject = 'release-pipeline';
      expect((await request(`/provider/targets/${targetId}/desired`)).status).toBe(403);
      expect((await report(targetId, id, running)).status).toBe(403);

      // An unknown target and a target with no provider are refused alike.
      serviceSubject = 'provider:basel';
      const unknown = await request('/provider/targets/nope/desired');
      expect(unknown.status).toBe(403);
      expect(((await unknown.json()) as { error: string }).error).toMatch(
        /"provider:basel" is not the provider of runtime target nope/,
      );
      expect((await request(`/provider/targets/${unboundId}/desired`)).status).toBe(403);

      principal = 'none';
      expect((await request(`/provider/targets/${targetId}/desired`)).status).toBe(401);
      // The permission framework is never consulted for a provider.
      expect(checked.filter(name => name !== 'installation.target.manage' && name !== 'installation.manage')).toEqual([]);
    });

    it('serve desired state with the provider’s credentials, and take its report', async () => {
      const targetId = await target();
      const id = await installed(targetId);
      principal = 'service';
      handedCredentials = [];

      const desired = await request(`/provider/targets/${targetId}/desired`);
      expect(desired.status).toBe(200);
      const body = (await desired.json()) as {
        installations: Array<{ id: string; desired: { imageDigest: string; configHash: string } }>;
      };
      expect(body.installations.map(i => i.id)).toEqual([id]);
      expect(handedCredentials).toEqual([{ principal: { type: 'service', subject: 'provider:basel' } }]);

      const { configHash } = body.installations[0].desired;
      expect((await report(targetId, id, { state: 'NOPE', desiredRevision: 1 })).status).toBe(400);
      expect((await report(targetId, 'nope', { state: 'RUNNING', desiredRevision: 1 })).status).toBe(404);
      expect((await report(targetId, id, { state: 'RUNNING', desiredRevision: 5 })).status).toBe(409);
      const ok = await report(targetId, id, {
        state: 'RUNNING',
        desiredRevision: 1,
        imageDigest: DIGEST_1,
        configHash,
      });
      expect(ok.status).toBe(200);
      expect(await ok.json()).toEqual(
        expect.objectContaining({
          qualificationStatus: 'EVIDENCE_RECORDED',
          observed: expect.objectContaining({ state: 'RUNNING', reportedBy: 'provider:basel' }),
        }),
      );

      principal = 'user';
      const iq = await request(`/installations/${id}/qualifications`);
      expect(((await iq.json()) as { items: Array<{ status: string }> }).items[0].status).toBe(
        'EVIDENCE_RECORDED',
      );
    });
  });

  it('tells the dialog what an act will ask for, under installation.read (NXD-141)', async () => {
    world.state.classification = { gmpRelevant: true, source: 'NO_PRODUCT' };
    const response = await request('/artifacts/pharma/oee/gmp-classification');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ gmpRelevant: true, source: 'NO_PRODUCT' });
    expect(checked).toEqual(['installation.read']);
    expect(handedCredentials).toEqual([
      { principal: { type: 'user', userEntityRef: OPERATOR } },
    ]);
    expect(world.classify).toHaveBeenCalledWith({ namespace: 'pharma', name: 'oee' });

    expect((await request('/artifacts/Pharma/oee/gmp-classification')).status).toBe(400);
    denied.add('installation.read');
    expect((await request('/artifacts/pharma/oee/gmp-classification')).status).toBe(403);
    expect(world.classify).toHaveBeenCalledTimes(1);
  });

  it('answers /health without credentials', async () => {
    principal = 'none';
    const response = await request('/health');
    expect(response.status).toBe(200);
  });
});
