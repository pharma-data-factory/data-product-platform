import { Logger } from 'winston';
import {
  AuthorizationProfile,
  Permission,
  RegistryDiagnostics,
  SuggestedRole,
  ValidationError,
} from './types';
import { AuthorizationProfileLoader } from './loader';

export class AuthorizationProfileRegistry {
  private profiles: Map<string, AuthorizationProfile> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private permissionsByDomain: Map<string, Permission[]> = new Map();
  private errors: ValidationError[] = [];
  private lastLoaded: Date | null = null;
  private sourcePaths: string[] = [];
  private loader: AuthorizationProfileLoader;

  constructor(private logger: Logger) {
    this.loader = new AuthorizationProfileLoader(logger);
  }

  async initialize(baseDir: string, pattern?: string): Promise<void> {
    this.logger.info('Initializing Authorization Profile Registry');

    const { profiles, errors } = await this.loader.loadProfiles(baseDir, pattern);

    this.errors = errors;
    this.lastLoaded = new Date();

    for (const profile of profiles) {
      const domain = profile.spec.domain;
      const name = profile.metadata.name;

      this.profiles.set(domain, profile);
      this.sourcePaths.push(profile.metadata.annotations?.templatePath || domain);

      // Index permissions by domain
      const domainPermissions: Permission[] = [];

      if (Array.isArray(profile.spec.permissions)) {
        for (const permission of profile.spec.permissions) {
          this.permissions.set(permission.name, permission);
          domainPermissions.push(permission);
        }
      }

      if (domainPermissions.length > 0) {
        this.permissionsByDomain.set(domain, domainPermissions);
      }

      this.logger.info(
        `Registered profile '${name}' (domain: ${domain}) with ${profile.spec.permissions?.length || 0} permissions`,
      );
    }

    this.logger.info(
      `Registry initialized with ${this.profiles.size} profiles and ${this.permissions.size} permissions`,
    );

    if (errors.length > 0) {
      this.logger.warn(`Registry loaded with ${errors.length} errors`);
    }
  }

  getProfiles(): AuthorizationProfile[] {
    return Array.from(this.profiles.values());
  }

  getProfileByDomain(domain: string): AuthorizationProfile | undefined {
    return this.profiles.get(domain);
  }

  getDomains(): string[] {
    return Array.from(this.profiles.keys()).sort();
  }

  getAllPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }

  getPermissionsByDomain(domain: string): Permission[] {
    return this.permissionsByDomain.get(domain) || [];
  }

  getSuggestedRoles(): SuggestedRole[] {
    const allRoles: SuggestedRole[] = [];

    for (const profile of this.profiles.values()) {
      if (Array.isArray(profile.spec.suggestedRoles)) {
        allRoles.push(...profile.spec.suggestedRoles);
      }
    }

    return allRoles;
  }

  getSuggestedRolesByDomain(domain: string): SuggestedRole[] {
    const profile = this.profiles.get(domain);
    return profile && Array.isArray(profile.spec.suggestedRoles) ? profile.spec.suggestedRoles : [];
  }

  getDiagnostics(): RegistryDiagnostics {
    const profilesValid = this.profiles.size;
    const profilesInvalid = this.errors.filter(e => !e.error.includes('Missing')).length;

    const permissionsByDomain: Record<string, number> = {};
    for (const [domain, permissions] of this.permissionsByDomain) {
      permissionsByDomain[domain] = permissions.length;
    }

    return {
      profilesDiscovered: profilesValid + profilesInvalid,
      profilesValid,
      profilesInvalid,
      permissionsDiscovered: this.permissions.size,
      permissionsByDomain,
      domainsDiscovered: this.getDomains(),
      errors: this.errors,
      lastLoaded: this.lastLoaded,
      sourcePaths: this.sourcePaths,
    };
  }

  hasProfile(domain: string): boolean {
    return this.profiles.has(domain);
  }

  hasPermission(permissionName: string): boolean {
    return this.permissions.has(permissionName);
  }
}
