export interface Permission {
  name: string;
  title: string;
  description: string;
  category: string;
  runtimeEnforcement: 'IMPLEMENTED' | 'EXTERNAL' | 'NOT_REQUIRED';
  enforcement: {
    location: string;
    mechanism: string;
    description: string;
  };
}

export interface SuggestedRole {
  name: string;
  title: string;
  description: string;
  permissions: string[];
  principalType: string;
}

export interface PlatformRoleMapping {
  platformRole: string;
  suggestedDomainRole: string;
  rationale: string;
}

export interface DependsOn {
  profile: string;
  reason: string;
}

export interface AppliesToSelector {
  kind: string;
  selector?: {
    matchLabels?: Record<string, string>;
  };
}

export interface AuthorizationProfile {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    title: string;
    namespace?: string;
    annotations?: Record<string, string>;
  };
  spec: {
    domain: string;
    title: string;
    description: string;
    permissions: Permission[];
    suggestedRoles?: SuggestedRole[];
    platformRoleMappings?: PlatformRoleMapping[];
    dependsOn?: DependsOn[];
    appliesTo?: AppliesToSelector[];
  };
}

export interface ValidationError {
  profile: string;
  error: string;
  path: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface RegistryDiagnostics {
  profilesDiscovered: number;
  profilesValid: number;
  profilesInvalid: number;
  permissionsDiscovered: number;
  permissionsByDomain: Record<string, number>;
  domainsDiscovered: string[];
  errors: ValidationError[];
  lastLoaded: Date | null;
  sourcePaths: string[];
}
