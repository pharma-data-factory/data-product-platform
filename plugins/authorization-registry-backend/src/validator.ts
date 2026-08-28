import { AuthorizationProfile, ValidationError, ValidationResult } from './types';

export class AuthorizationProfileValidator {
  validate(profile: AuthorizationProfile, filePath: string): ValidationResult {
    const errors: ValidationError[] = [];

    // Check apiVersion
    if (!profile.apiVersion) {
      errors.push({
        profile: profile.metadata?.name || 'unknown',
        error: 'Missing apiVersion field',
        path: filePath,
      });
    } else if (profile.apiVersion !== 'platform.nexora.io/v1alpha1') {
      errors.push({
        profile: profile.metadata?.name || 'unknown',
        error: `Invalid apiVersion '${profile.apiVersion}', expected 'platform.nexora.io/v1alpha1'`,
        path: filePath,
      });
    }

    // Check kind
    if (!profile.kind) {
      errors.push({
        profile: profile.metadata?.name || 'unknown',
        error: 'Missing kind field',
        path: filePath,
      });
    } else if (profile.kind !== 'AuthorizationProfile') {
      errors.push({
        profile: profile.metadata?.name || 'unknown',
        error: `Invalid kind '${profile.kind}', expected 'AuthorizationProfile'`,
        path: filePath,
      });
    }

    // Check metadata
    if (!profile.metadata) {
      errors.push({
        profile: 'unknown',
        error: 'Missing metadata section',
        path: filePath,
      });
      return { valid: errors.length === 0, errors };
    }

    if (!profile.metadata.name) {
      errors.push({
        profile: 'unknown',
        error: 'Missing metadata.name field',
        path: filePath,
      });
    }

    // Check spec
    if (!profile.spec) {
      errors.push({
        profile: profile.metadata.name || 'unknown',
        error: 'Missing spec section',
        path: filePath,
      });
      return { valid: errors.length === 0, errors };
    }

    if (!profile.spec.domain) {
      errors.push({
        profile: profile.metadata.name || 'unknown',
        error: 'Missing spec.domain field',
        path: filePath,
      });
    }

    // Check permissions
    if (!Array.isArray(profile.spec.permissions)) {
      errors.push({
        profile: profile.metadata.name || 'unknown',
        error: 'spec.permissions must be an array',
        path: filePath,
      });
    } else {
      const permissionNames = new Set<string>();

      for (const permission of profile.spec.permissions) {
        if (!permission.name) {
          errors.push({
            profile: profile.metadata.name || 'unknown',
            error: 'Permission missing name field',
            path: filePath,
          });
          continue;
        }

        if (!permission.title || !permission.description) {
          errors.push({
            profile: profile.metadata.name || 'unknown',
            error: `Permission '${permission.name}' missing title or description`,
            path: filePath,
          });
          continue;
        }

        // Check naming convention
        if (profile.spec.domain && !permission.name.startsWith(profile.spec.domain + '.')) {
          errors.push({
            profile: profile.metadata.name || 'unknown',
            error: `Permission name '${permission.name}' does not start with domain prefix '${profile.spec.domain}.'`,
            path: filePath,
          });
        }

        permissionNames.add(permission.name);
      }
    }

    // Check suggested roles
    if (Array.isArray(profile.spec.suggestedRoles)) {
      const permissionNames = new Set(profile.spec.permissions?.map(p => p.name) || []);

      for (const role of profile.spec.suggestedRoles) {
        if (!role.name || !role.title || !role.description) {
          errors.push({
            profile: profile.metadata.name || 'unknown',
            error: `Role missing required fields: ${role.name || 'unknown'}`,
            path: filePath,
          });
        }

        if (Array.isArray(role.permissions)) {
          for (const permName of role.permissions) {
            if (!permissionNames.has(permName)) {
              errors.push({
                profile: profile.metadata.name || 'unknown',
                error: `Role '${role.name}' references unknown permission '${permName}'`,
                path: filePath,
              });
            }
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
