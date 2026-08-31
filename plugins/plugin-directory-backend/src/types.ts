export type PluginType =
  | 'PLATFORM'
  | 'DOMAIN'
  | 'INDUSTRIAL'
  | 'VALIDATION'
  | 'INTEGRATION'
  | 'EXPERIMENTAL';

export type PluginLifecycle =
  | 'ENABLED'
  | 'DISABLED'
  | 'DEVELOPMENT'
  | 'DEPRECATED';

export type PluginValidationStatus =
  | 'NOT_VALIDATED'
  | 'VALIDATION_IN_PROGRESS'
  | 'VALIDATED'
  | 'NOT_APPLICABLE'
  | 'NOT_ESTABLISHED';

export type PluginSource =
  | 'WORKSPACE'
  | 'BACKSTAGE_CORE'
  | 'CONFIG'
  | 'MANIFEST'
  | 'COMMUNITY'
  | 'PARTNER';

export interface NexoraPluginDescriptor {
  id: string;
  name: string;
  description?: string;
  frontendPackage?: string;
  backendPackage?: string;
  version?: string;
  type: PluginType;
  lifecycle: PluginLifecycle;
  frontendRoute?: string;
  backendRoute?: string;
  permissions?: string[];
  owner?: string;
  source: PluginSource;
  validationStatus: PluginValidationStatus;
  validationReference?: string;
  dependencies?: string[];
  /** True when frontend and/or backend is registered in the running platform. */
  runtimeLoaded?: boolean;
  frontendLoaded?: boolean;
  backendLoaded?: boolean;
  experimental?: boolean;
  presentInWorkspace?: boolean;
}

export interface PluginDirectorySummary {
  total: number;
  enabled: number;
  development: number;
  disabled: number;
  deprecated: number;
  validationRelevant: number;
  backstageCoreVersion?: string;
}

export interface PluginDirectoryListResponse {
  items: NexoraPluginDescriptor[];
  summary: PluginDirectorySummary;
}

export interface PluginManifestFile {
  id?: string;
  name?: string;
  description?: string;
  type?: PluginType;
  lifecycle?: PluginLifecycle;
  frontend?: { package?: string; route?: string };
  backend?: { package?: string; route?: string };
  owner?: string;
  permissions?: string[];
  validation?: {
    status?: PluginValidationStatus;
    reference?: string;
  };
  dependencies?: string[];
  experimental?: boolean;
}

export interface PackageJsonBackstage {
  role?: string;
  pluginId?: string;
  pluginPackages?: string[];
}

export interface PackageJsonLike {
  name?: string;
  version?: string;
  description?: string;
  backstage?: PackageJsonBackstage;
  dependencies?: Record<string, string>;
}
