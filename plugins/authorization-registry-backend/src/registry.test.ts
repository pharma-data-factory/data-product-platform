import { AuthorizationProfileRegistry } from './registry';
import { createMockLogger } from '@backstage/backend-test-utils';

describe('AuthorizationProfileRegistry', () => {
  let registry: AuthorizationProfileRegistry;
  let logger = createMockLogger();

  beforeEach(() => {
    logger = createMockLogger();
    registry = new AuthorizationProfileRegistry(logger);
  });

  describe('initialization', () => {
    it('should initialize registry with profiles from filesystem', async () => {
      // This test requires the actual filesystem with templates
      // It will be run as an integration test
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      const profiles = registry.getProfiles();
      expect(profiles.length).toBeGreaterThan(0);
    });

    it('should discover all 6 golden path profiles', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      const profiles = registry.getProfiles();
      const domains = profiles.map(p => p.spec.domain).sort();

      expect(domains).toEqual(['aas', 'equipment', 'machine-state', 'mqtt', 'oee', 'uns']);
    });

    it('should discover exactly 24 permissions', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      const permissions = registry.getAllPermissions();
      expect(permissions.length).toBe(24);
    });
  });

  describe('getProfiles', () => {
    it('should return all profiles', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      const profiles = registry.getProfiles();
      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles.length).toBe(6);
    });

    it('each profile should have required fields', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      const profiles = registry.getProfiles();
      profiles.forEach(p => {
        expect(p.metadata.name).toBeDefined();
        expect(p.spec.domain).toBeDefined();
        expect(p.spec.permissions).toBeDefined();
      });
    });
  });

  describe('getProfileByDomain', () => {
    it('should return OEE profile for oee domain', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      const profile = registry.getProfileByDomain('oee');
      expect(profile).toBeDefined();
      expect(profile?.spec.domain).toBe('oee');
      expect(profile?.metadata.name).toBe('oee');
    });

    it('should return undefined for unknown domain', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      const profile = registry.getProfileByDomain('nonexistent');
      expect(profile).toBeUndefined();
    });

    it('should return MQTT profile for mqtt domain', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      const profile = registry.getProfileByDomain('mqtt');
      expect(profile).toBeDefined();
      expect(profile?.spec.domain).toBe('mqtt');
    });
  });

  describe('getDomains', () => {
    it('should return all 6 domains in sorted order', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      const domains = registry.getDomains();
      expect(domains).toEqual(['aas', 'equipment', 'machine-state', 'mqtt', 'oee', 'uns']);
    });
  });

  describe('getPermissionsByDomain', () => {
    it('should return 4 permissions for mqtt domain', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      const permissions = registry.getPermissionsByDomain('mqtt');
      expect(permissions.length).toBe(4);
    });

    it('should return permissions with correct naming convention', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      const permissions = registry.getPermissionsByDomain('oee');
      const permNames = permissions.map(p => p.name);

      expect(permNames).toContain('oee.read');
      expect(permNames).toContain('oee.operate');
      expect(permNames).toContain('oee.configure');
      expect(permNames).toContain('oee.admin');
    });

    it('should return empty array for unknown domain', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      const permissions = registry.getPermissionsByDomain('nonexistent');
      expect(permissions).toEqual([]);
    });
  });

  describe('getAllPermissions', () => {
    it('should return all 24 permissions', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      const permissions = registry.getAllPermissions();
      expect(permissions.length).toBe(24);
    });

    it('should include permissions from all domains', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      const permissions = registry.getAllPermissions();
      const domains = new Set(permissions.map(p => p.name.split('.')[0]));

      expect(domains).toContain('aas');
      expect(domains).toContain('equipment');
      expect(domains).toContain('machine-state');
      expect(domains).toContain('mqtt');
      expect(domains).toContain('oee');
      expect(domains).toContain('uns');
    });
  });

  describe('getSuggestedRoles', () => {
    it('should return all suggested roles', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      const roles = registry.getSuggestedRoles();
      expect(roles.length).toBeGreaterThan(0);
      expect(roles.length).toBe(24); // 4 roles per domain × 6 domains
    });
  });

  describe('getDiagnostics', () => {
    it('should return correct diagnostics', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      const diagnostics = registry.getDiagnostics();

      expect(diagnostics.profilesDiscovered).toBeGreaterThanOrEqual(6);
      expect(diagnostics.profilesValid).toBe(6);
      expect(diagnostics.profilesInvalid).toBe(0);
      expect(diagnostics.permissionsDiscovered).toBe(24);
      expect(diagnostics.lastLoaded).toBeDefined();
      expect(diagnostics.domainsDiscovered.length).toBe(6);
    });

    it('should include all domains in diagnostics', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      const diagnostics = registry.getDiagnostics();
      const domains = diagnostics.domainsDiscovered;

      expect(domains).toContain('aas');
      expect(domains).toContain('equipment');
      expect(domains).toContain('machine-state');
      expect(domains).toContain('mqtt');
      expect(domains).toContain('oee');
      expect(domains).toContain('uns');
    });

    it('should report correct permission counts by domain', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      const diagnostics = registry.getDiagnostics();

      expect(diagnostics.permissionsByDomain['aas']).toBe(4);
      expect(diagnostics.permissionsByDomain['equipment']).toBe(4);
      expect(diagnostics.permissionsByDomain['machine-state']).toBe(4);
      expect(diagnostics.permissionsByDomain['mqtt']).toBe(4);
      expect(diagnostics.permissionsByDomain['oee']).toBe(4);
      expect(diagnostics.permissionsByDomain['uns']).toBe(4);
    });
  });

  describe('hasProfile', () => {
    it('should return true for existing domain', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      expect(registry.hasProfile('oee')).toBe(true);
    });

    it('should return false for nonexistent domain', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      expect(registry.hasProfile('nonexistent')).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return true for existing permission', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      expect(registry.hasPermission('oee.read')).toBe(true);
    });

    it('should return false for nonexistent permission', async () => {
      const baseDir = process.cwd();
      await registry.initialize(baseDir);

      expect(registry.hasPermission('nonexistent.read')).toBe(false);
    });
  });
});
