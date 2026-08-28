import express from 'express';
import { AddressInfo } from 'net';
import { createRouter } from './router';
import { AuthorizationProfileRegistry } from './registry';
import { createMockLogger } from '@backstage/backend-test-utils';

async function get(app: express.Express, urlPath: string) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', () => resolve()));
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}${urlPath}`);
    return {
      status: response.status,
      body: await response.json(),
    };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve())),
    );
  }
}

describe('authorization-registry router', () => {
  let registry: AuthorizationProfileRegistry;
  let logger = createMockLogger();

  beforeAll(async () => {
    logger = createMockLogger();
    registry = new AuthorizationProfileRegistry(logger);
    const baseDir = process.cwd();
    await registry.initialize(baseDir);
  });

  async function makeRouter() {
    const router = await createRouter({
      logger,
      registry,
    });
    const app = express();
    app.use(router);
    return app;
  }

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const app = await makeRouter();
      const { status, body } = await get(app, '/health');

      expect(status).toBe(200);
      expect(body.status).toBe('ok');
    });
  });

  describe('GET /profiles', () => {
    it('should return 200 with all profiles', async () => {
      const app = await makeRouter();
      const { status, body } = await get(app, '/profiles');

      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(6);
    });

    it('should return profile summary with domain and permission count', async () => {
      const app = await makeRouter();
      const { status, body } = await get(app, '/profiles');

      const oeeProfile = body.find((p: any) => p.domain === 'oee');
      expect(oeeProfile).toBeDefined();
      expect(oeeProfile.name).toBe('oee');
      expect(oeeProfile.permissions).toBe(4);
    });
  });

  describe('GET /profiles/:domain', () => {
    it('should return OEE profile', async () => {
      const app = await makeRouter();
      const { status, body } = await get(app, '/profiles/oee');

      expect(status).toBe(200);
      expect(body.domain).toBe('oee');
      expect(body.name).toBe('oee');
      expect(Array.isArray(body.permissions)).toBe(true);
      expect(body.permissions.length).toBe(4);
    });

    it('should return 404 for unknown domain', async () => {
      const app = await makeRouter();
      const { status, body } = await get(app, '/profiles/nonexistent');

      expect(status).toBe(404);
      expect(body.error).toBeDefined();
    });

    it('should return MQTT profile with all permissions', async () => {
      const app = await makeRouter();
      const { status, body } = await get(app, '/profiles/mqtt');

      expect(status).toBe(200);
      expect(body.domain).toBe('mqtt');
      const permNames = body.permissions.map((p: any) => p.name);
      expect(permNames).toContain('mqtt.read');
      expect(permNames).toContain('mqtt.operate');
      expect(permNames).toContain('mqtt.configure');
      expect(permNames).toContain('mqtt.admin');
    });
  });

  describe('GET /permissions', () => {
    it('should return 200 with all permissions', async () => {
      const app = await makeRouter();
      const { status, body } = await get(app, '/permissions');

      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(24);
    });

    it('should include permissions from all domains', async () => {
      const app = await makeRouter();
      const { body } = await get(app, '/permissions');

      const permNames = body.map((p: any) => p.name);
      expect(permNames).toContain('oee.read');
      expect(permNames).toContain('mqtt.read');
      expect(permNames).toContain('aas.read');
      expect(permNames).toContain('equipment.read');
      expect(permNames).toContain('machine-state.read');
      expect(permNames).toContain('uns.read');
    });
  });

  describe('GET /permissions/:domain', () => {
    it('should return permissions for mqtt domain', async () => {
      const app = await makeRouter();
      const { status, body } = await get(app, '/permissions/mqtt');

      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(4);

      const permNames = body.map((p: any) => p.name);
      expect(permNames).toEqual(['mqtt.read', 'mqtt.operate', 'mqtt.configure', 'mqtt.admin']);
    });

    it('should return 404 for unknown domain', async () => {
      const app = await makeRouter();
      const { status } = await get(app, '/permissions/nonexistent');

      expect(status).toBe(404);
    });

    it('should return permissions for OEE domain', async () => {
      const app = await makeRouter();
      const { status, body } = await get(app, '/permissions/oee');

      expect(status).toBe(200);
      expect(body.length).toBe(4);
    });
  });

  describe('GET /diagnostics', () => {
    it('should return valid diagnostics', async () => {
      const app = await makeRouter();
      const { status, body } = await get(app, '/diagnostics');

      expect(status).toBe(200);
      expect(body.profilesDiscovered).toBeGreaterThanOrEqual(6);
      expect(body.profilesValid).toBe(6);
      expect(body.profilesInvalid).toBe(0);
      expect(body.permissionsDiscovered).toBe(24);
    });

    it('should include all domains in diagnostics', async () => {
      const app = await makeRouter();
      const { body } = await get(app, '/diagnostics');

      const domains = body.domainsDiscovered;
      expect(domains).toContain('aas');
      expect(domains).toContain('equipment');
      expect(domains).toContain('machine-state');
      expect(domains).toContain('mqtt');
      expect(domains).toContain('oee');
      expect(domains).toContain('uns');
    });

    it('should report correct counts per domain', async () => {
      const app = await makeRouter();
      const { body } = await get(app, '/diagnostics');

      expect(body.permissionsByDomain['oee']).toBe(4);
      expect(body.permissionsByDomain['mqtt']).toBe(4);
      expect(body.permissionsByDomain['aas']).toBe(4);
      expect(body.permissionsByDomain['equipment']).toBe(4);
      expect(body.permissionsByDomain['machine-state']).toBe(4);
      expect(body.permissionsByDomain['uns']).toBe(4);
    });

    it('should have no errors', async () => {
      const app = await makeRouter();
      const { body } = await get(app, '/diagnostics');

      expect(body.errors).toBeDefined();
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors.length).toBe(0);
    });
  });

  describe('GET /roles', () => {
    it('should return all suggested roles', async () => {
      const app = await makeRouter();
      const { status, body } = await get(app, '/roles');

      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(24); // 4 roles per domain × 6 domains
    });

    it('should return roles with permissions', async () => {
      const app = await makeRouter();
      const { body } = await get(app, '/roles');

      const viewerRoles = body.filter((r: any) => r.name.includes('viewer'));
      expect(viewerRoles.length).toBeGreaterThan(0);

      viewerRoles.forEach((role: any) => {
        expect(role.permissions).toBeDefined();
        expect(Array.isArray(role.permissions)).toBe(true);
      });
    });
  });

  describe('GET /roles/:domain', () => {
    it('should return roles for mqtt domain', async () => {
      const app = await makeRouter();
      const { status, body } = await get(app, '/roles/mqtt');

      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(4);
    });

    it('should return 404 for unknown domain', async () => {
      const app = await makeRouter();
      const { status } = await get(app, '/roles/nonexistent');

      expect(status).toBe(404);
    });

    it('should return OEE roles with correct names', async () => {
      const app = await makeRouter();
      const { body } = await get(app, '/roles/oee');

      const roleNames = body.map((r: any) => r.name);
      expect(roleNames).toContain('oee-viewer');
      expect(roleNames).toContain('oee-operator');
      expect(roleNames).toContain('oee-engineer');
      expect(roleNames).toContain('oee-admin');
    });
  });
});
