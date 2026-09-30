/**
 * NXD-099. Whether a Golden Path can publish, known before it runs.
 *
 * A run rendered the skeleton, checked the URS baseline and only then failed
 * in publish:github with "No token available for host: github.com". Whether
 * the host has credentials is configuration, so it is checked at step one and
 * offered to the frontend before any form is filled in.
 */

import express from 'express';
import { AuthenticationError } from '@backstage/errors';
import { ConfigReader } from '@backstage/config';
import { listenOnFetchablePort } from '@internal/backend-test-utils';
import { getPublishReadiness } from './scm-publish-readiness';
import { createScmResolveRepoAction } from './scaffolderModule';
import { createRouter } from './router';

const target = { nexora: { scm: { host: 'github.com', organization: 'acme' } } };
const config = (data: object) => new ConfigReader(data);

describe('getPublishReadiness', () => {
  it('is ready with a token for the target host', () => {
    expect(
      getPublishReadiness(
        config({
          ...target,
          integrations: { github: [{ host: 'github.com', token: 'ghp_x' }] },
        }),
      ),
    ).toEqual({ ready: true, host: 'github.com', owner: 'acme' });
  });

  it('is ready with a complete GitHub App', () => {
    expect(
      getPublishReadiness(
        config({
          ...target,
          integrations: {
            github: [{ host: 'github.com', apps: [{ appId: '1', privateKey: 'k' }] }],
          },
        }),
      ).ready,
    ).toBe(true);
  });

  it('is not ready when the integration exists without credentials — the case that shipped', () => {
    // app-config.yaml has `token: ${GITHUB_TOKEN}`; with the variable unset
    // the key is dropped and the integration has nothing to publish with.
    const readiness = getPublishReadiness(
      config({ ...target, integrations: { github: [{ host: 'github.com' }] } }),
    );
    expect(readiness).toMatchObject({ ready: false, reason: 'NO_CREDENTIALS' });
    expect(readiness.ready === false && readiness.message).toMatch(
      /No GitHub credentials are configured for github\.com.*github\.com\/acme/,
    );
  });

  it('does not count an app with no private key, a blank token, or another host', () => {
    for (const github of [
      [{ host: 'github.com', apps: [{ appId: '1' }] }],
      [{ host: 'github.com', token: '  ' }],
      [{ host: 'github.com', token: '${GITHUB_TOKEN}' }],
      [{ host: 'ghe.example.net', token: 'ghp_x' }],
    ]) {
      expect(
        getPublishReadiness(config({ ...target, integrations: { github } })).ready,
      ).toBe(false);
    }
  });

  it('treats an integration without a host as github.com, as Backstage does', () => {
    expect(
      getPublishReadiness(
        config({ ...target, integrations: { github: [{ token: 'ghp_x' }] } }),
      ).ready,
    ).toBe(true);
  });

  it('names a missing publish target separately', () => {
    expect(getPublishReadiness(config({}))).toMatchObject({
      ready: false,
      reason: 'NO_SCM_TARGET',
    });
  });
});

describe('nexora:scm:resolve-repo stops at step one without credentials', () => {
  function run(data: object) {
    const outputs: Record<string, unknown> = {};
    const action = createScmResolveRepoAction({ config: config(data) });
    const ctx = {
      input: { repo: 'filler-01-oee' },
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      output: (name: string, value: unknown) => {
        outputs[name] = value;
      },
    };
    return { promise: action.handler(ctx as never), outputs };
  }

  it('refuses with the reason instead of resolving a target it cannot publish to', async () => {
    const { promise, outputs } = run({
      ...target,
      integrations: { github: [{ host: 'github.com' }] },
    });
    await expect(promise).rejects.toThrow(/No GitHub credentials are configured/);
    expect(outputs).toEqual({});
  });

  it('resolves the coordinate when credentials exist', async () => {
    const { promise, outputs } = run({
      ...target,
      integrations: { github: [{ host: 'github.com', token: 'ghp_x' }] },
    });
    await promise;
    expect(outputs.repoUrl).toBe('github.com?owner=acme&repo=filler-01-oee');
  });
});

describe('GET /scm/publish-readiness', () => {
  async function get(signedIn: boolean) {
    const httpAuth = {
      credentials: jest.fn(async () => {
        if (!signedIn) throw new AuthenticationError('No credentials');
        return { principal: { userEntityRef: 'user:default/guest' } };
      }),
    };
    const router = await createRouter({
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      httpAuth,
      service: {},
      publishReadiness: getPublishReadiness(
        config({ ...target, integrations: { github: [{ host: 'github.com' }] } }),
      ),
    } as never);
    const app = express();
    app.use(router);
    const server = await listenOnFetchablePort(app);
    try {
      const res = await fetch(`${server.url}/scm/publish-readiness`);
      return { status: res.status, body: await res.json() };
    } finally {
      await server.close();
    }
  }

  it('tells a signed-in user whether publishing can work here', async () => {
    const { status, body } = await get(true);
    expect(status).toBe(200);
    expect(body).toMatchObject({
      ready: false,
      reason: 'NO_CREDENTIALS',
      host: 'github.com',
      owner: 'acme',
    });
  });

  it('answers nobody who is not signed in', async () => {
    expect((await get(false)).status).toBe(401);
  });
});
