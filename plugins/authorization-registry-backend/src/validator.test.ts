import { AuthorizationProfileValidator } from './validator';
import { AuthorizationProfile } from './types';

describe('AuthorizationProfileValidator', () => {
  let validator: AuthorizationProfileValidator;

  beforeEach(() => {
    validator = new AuthorizationProfileValidator();
  });

  const validProfile: AuthorizationProfile = {
    apiVersion: 'platform.nexora.io/v1alpha1',
    kind: 'AuthorizationProfile',
    metadata: {
      name: 'test-profile',
      title: 'Test Profile',
    },
    spec: {
      domain: 'test',
      title: 'Test Domain',
      description: 'A test authorization profile',
      permissions: [
        {
          name: 'test.read',
          title: 'Read Test',
          description: 'Read test data',
          category: 'read',
          runtimeEnforcement: 'IMPLEMENTED',
          enforcement: {
            location: 'runtime',
            mechanism: 'api-check',
            description: 'Runtime API check',
          },
        },
      ],
    },
  };

  describe('validate', () => {
    it('should validate a correct profile', () => {
      const result = validator.validate(validProfile, '/test/profile.yaml');

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject profile with missing apiVersion', () => {
      const profile = { ...validProfile, apiVersion: undefined };
      const result = validator.validate(profile as AuthorizationProfile, '/test/profile.yaml');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].error).toContain('apiVersion');
    });

    it('should reject profile with invalid apiVersion', () => {
      const profile = { ...validProfile, apiVersion: 'invalid/v1' };
      const result = validator.validate(profile, '/test/profile.yaml');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.error.includes('apiVersion'))).toBe(true);
    });

    it('should reject profile with invalid kind', () => {
      const profile = { ...validProfile, kind: 'InvalidKind' };
      const result = validator.validate(profile, '/test/profile.yaml');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.error.includes('kind'))).toBe(true);
    });

    it('should reject profile with missing metadata', () => {
      const profile = { ...validProfile, metadata: undefined };
      const result = validator.validate(profile as AuthorizationProfile, '/test/profile.yaml');

      expect(result.valid).toBe(false);
    });

    it('should reject profile with missing metadata.name', () => {
      const profile = {
        ...validProfile,
        metadata: { title: 'Test' },
      };
      const result = validator.validate(profile as AuthorizationProfile, '/test/profile.yaml');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.error.includes('name'))).toBe(true);
    });

    it('should reject profile with missing spec', () => {
      const profile = { ...validProfile, spec: undefined };
      const result = validator.validate(profile as AuthorizationProfile, '/test/profile.yaml');

      expect(result.valid).toBe(false);
    });

    it('should reject profile with missing spec.domain', () => {
      const profile = {
        ...validProfile,
        spec: { ...validProfile.spec, domain: undefined },
      };
      const result = validator.validate(profile as AuthorizationProfile, '/test/profile.yaml');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.error.includes('domain'))).toBe(true);
    });

    it('should reject profile with non-array permissions', () => {
      const profile = {
        ...validProfile,
        spec: { ...validProfile.spec, permissions: {} },
      };
      const result = validator.validate(profile as AuthorizationProfile, '/test/profile.yaml');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.error.includes('array'))).toBe(true);
    });

    it('should reject permission with invalid naming convention', () => {
      const profile = {
        ...validProfile,
        spec: {
          ...validProfile.spec,
          permissions: [
            {
              ...validProfile.spec.permissions[0],
              name: 'invalid-prefix.read',
            },
          ],
        },
      };
      const result = validator.validate(profile, '/test/profile.yaml');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.error.includes('domain prefix'))).toBe(true);
    });

    it('should reject permission missing title', () => {
      const profile = {
        ...validProfile,
        spec: {
          ...validProfile.spec,
          permissions: [
            {
              ...validProfile.spec.permissions[0],
              title: undefined,
            },
          ],
        },
      };
      const result = validator.validate(profile as AuthorizationProfile, '/test/profile.yaml');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.error.includes('title'))).toBe(true);
    });

    it('should reject role with missing required fields', () => {
      const profile = {
        ...validProfile,
        spec: {
          ...validProfile.spec,
          suggestedRoles: [
            {
              name: 'test-viewer',
              title: undefined,
              description: 'View test data',
              permissions: ['test.read'],
              principalType: 'user',
            },
          ],
        },
      };
      const result = validator.validate(profile as AuthorizationProfile, '/test/profile.yaml');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.error.includes('title'))).toBe(true);
    });

    it('should reject role referencing unknown permission', () => {
      const profile = {
        ...validProfile,
        spec: {
          ...validProfile.spec,
          suggestedRoles: [
            {
              name: 'test-viewer',
              title: 'Test Viewer',
              description: 'View test data',
              permissions: ['test.read', 'test.unknown'],
              principalType: 'user',
            },
          ],
        },
      };
      const result = validator.validate(profile, '/test/profile.yaml');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.error.includes('unknown permission'))).toBe(true);
    });

    it('should validate profile with multiple permissions', () => {
      const profile = {
        ...validProfile,
        spec: {
          ...validProfile.spec,
          permissions: [
            validProfile.spec.permissions[0],
            {
              name: 'test.write',
              title: 'Write Test',
              description: 'Write test data',
              category: 'write',
              runtimeEnforcement: 'IMPLEMENTED' as const,
              enforcement: {
                location: 'runtime',
                mechanism: 'api-check',
                description: 'Runtime API check',
              },
            },
          ],
        },
      };
      const result = validator.validate(profile, '/test/profile.yaml');

      expect(result.valid).toBe(true);
    });
  });
});
