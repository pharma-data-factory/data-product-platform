import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import type {
  NexoraPluginDescriptor,
  PackageJsonLike,
  PluginDirectorySummary,
  PluginLifecycle,
  PluginManifestFile,
  PluginType,
  PluginValidationStatus,
} from './types';

export interface InventoryOptions {
  workspaceRoot: string;
  logger?: { warn: (message: string) => void };
}

/** Conservative defaults when no plugin.yaml is present. */
const DEFAULTS: Record<
  string,
  Partial<NexoraPluginDescriptor> & { type: PluginType }
> = {
  'validation-expert': {
    type: 'VALIDATION',
    name: 'Validation Expert',
    lifecycle: 'ENABLED',
    frontendRoute: '/validation-expert',
    backendRoute: '/api/validation-expert',
    validationStatus: 'NOT_VALIDATED',
    validationReference: 'validation-expert/VALIDATION-IMPACT.md',
    permissions: [
      'validation.read',
      'requirement.read',
      'traceability.read',
      'validation.run.start',
      'validation.test.execute',
      'validation.review',
      'validation.admin',
    ],
    owner: 'platform-team',
  },
  'data-products': {
    type: 'DOMAIN',
    name: 'Data Products',
    lifecycle: 'ENABLED',
    frontendRoute: '/data-products',
    backendRoute: '/api/data-products',
    validationStatus: 'NOT_ESTABLISHED',
  },
  marketplace: {
    type: 'PLATFORM',
    name: 'Marketplace',
    lifecycle: 'ENABLED',
    frontendRoute: '/marketplace',
    validationStatus: 'NOT_ESTABLISHED',
  },
  entitlements: {
    type: 'PLATFORM',
    name: 'Entitlements',
    lifecycle: 'ENABLED',
    backendRoute: '/api/entitlements',
    validationStatus: 'NOT_ESTABLISHED',
  },
  'nexora-assets': {
    type: 'DOMAIN',
    name: 'Nexora Assets',
    lifecycle: 'ENABLED',
    frontendRoute: '/assets',
    validationStatus: 'NOT_ESTABLISHED',
  },
  'nexora-contracts': {
    type: 'DOMAIN',
    name: 'Nexora Contracts',
    lifecycle: 'ENABLED',
    validationStatus: 'NOT_ESTABLISHED',
  },
  'nexora-quality': {
    type: 'PLATFORM',
    name: 'Nexora Quality',
    lifecycle: 'ENABLED',
    validationStatus: 'NOT_ESTABLISHED',
  },
  'nexora-common': {
    type: 'PLATFORM',
    name: 'Nexora Common',
    lifecycle: 'ENABLED',
    validationStatus: 'NOT_APPLICABLE',
  },
  'nexora-industrial': {
    type: 'INDUSTRIAL',
    name: 'Nexora Industrial / AAS',
    lifecycle: 'DEVELOPMENT',
    validationStatus: 'NOT_ESTABLISHED',
    experimental: true,
  },
  'plugin-directory': {
    type: 'PLATFORM',
    name: 'Plugin Directory',
    lifecycle: 'ENABLED',
    frontendRoute: '/admin/plugins',
    backendRoute: '/api/plugin-directory',
    validationStatus: 'NOT_VALIDATED',
    validationReference: 'plugin-directory-design.md',
    permissions: ['pluginDirectory.read', 'pluginDirectory.admin'],
    owner: 'platform-team',
  },
};

const FRONTEND_ROLES = new Set(['frontend-plugin', 'web-library']);
const BACKEND_ROLES = new Set(['backend-plugin']);

export function resolveWorkspaceRoot(startDir: string): string {
  let current = path.resolve(startDir);
  for (let i = 0; i < 12; i += 1) {
    if (
      fs.existsSync(path.join(current, 'backstage.json')) &&
      fs.existsSync(path.join(current, 'plugins'))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  throw new Error(`Unable to resolve workspace root from ${startDir}`);
}

function readJson<T>(filePath: string): T | undefined {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

function readManifest(
  filePath: string,
  logger?: InventoryOptions['logger'],
): PluginManifestFile | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  try {
    const parsed = yaml.parse(fs.readFileSync(filePath, 'utf8'));
    if (!parsed || typeof parsed !== 'object') {
      logger?.warn(`Ignoring malformed plugin manifest: ${filePath}`);
      return undefined;
    }
    return parsed as PluginManifestFile;
  } catch (error) {
    logger?.warn(
      `Ignoring unreadable plugin manifest ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return undefined;
  }
}

function titleCaseId(id: string): string {
  return id
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function extractInternalPluginImports(source: string): Set<string> {
  const found = new Set<string>();
  const re = /@internal\/plugin-([a-z0-9-]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    found.add(match[1]);
  }
  return found;
}

function mapImportToPluginId(folderOrSuffix: string): string {
  if (
    folderOrSuffix === 'directory' ||
    folderOrSuffix === 'directory-backend'
  ) {
    return 'plugin-directory';
  }
  if (folderOrSuffix.endsWith('-backend')) {
    const base = folderOrSuffix.replace(/-backend$/, '');
    if (base === 'nexora') {
      return 'nexora-industrial';
    }
    return base;
  }
  return folderOrSuffix;
}

export function buildSummary(
  items: NexoraPluginDescriptor[],
  backstageCoreVersion?: string,
): PluginDirectorySummary {
  return {
    total: items.length,
    enabled: items.filter(item => item.lifecycle === 'ENABLED').length,
    development: items.filter(item => item.lifecycle === 'DEVELOPMENT').length,
    disabled: items.filter(item => item.lifecycle === 'DISABLED').length,
    deprecated: items.filter(item => item.lifecycle === 'DEPRECATED').length,
    validationRelevant: items.filter(
      item =>
        item.type === 'VALIDATION' ||
        item.validationStatus === 'NOT_VALIDATED' ||
        item.validationStatus === 'VALIDATION_IN_PROGRESS' ||
        Boolean(item.validationReference),
    ).length,
    backstageCoreVersion,
  };
}

export function discoverPlugins(options: InventoryOptions): NexoraPluginDescriptor[] {
  const { workspaceRoot, logger } = options;
  const pluginsDir = path.join(workspaceRoot, 'plugins');
  const byId = new Map<string, NexoraPluginDescriptor>();

  const appPkg = readJson<PackageJsonLike>(
    path.join(workspaceRoot, 'packages', 'app', 'package.json'),
  );
  const backendPkg = readJson<PackageJsonLike>(
    path.join(workspaceRoot, 'packages', 'backend', 'package.json'),
  );
  const appTsxPath = path.join(workspaceRoot, 'packages', 'app', 'src', 'App.tsx');
  const appTsx = fs.existsSync(appTsxPath)
    ? fs.readFileSync(appTsxPath, 'utf8')
    : '';
  const backendIndex = fs.existsSync(
    path.join(workspaceRoot, 'packages', 'backend', 'src', 'index.ts'),
  )
    ? fs.readFileSync(
        path.join(workspaceRoot, 'packages', 'backend', 'src', 'index.ts'),
        'utf8',
      )
    : '';

  const frontendLoadedIds = new Set<string>();
  const backendLoadedIds = new Set<string>();

  for (const name of Object.keys(appPkg?.dependencies ?? {})) {
    if (name.startsWith('@internal/plugin-')) {
      frontendLoadedIds.add(mapImportToPluginId(name.replace('@internal/plugin-', '')));
    }
  }
  for (const suffix of extractInternalPluginImports(appTsx)) {
    frontendLoadedIds.add(mapImportToPluginId(suffix));
  }
  for (const name of Object.keys(backendPkg?.dependencies ?? {})) {
    if (name.startsWith('@internal/plugin-')) {
      backendLoadedIds.add(mapImportToPluginId(name.replace('@internal/plugin-', '')));
    }
  }
  for (const suffix of extractInternalPluginImports(backendIndex)) {
    backendLoadedIds.add(mapImportToPluginId(suffix));
  }
  // Local aas plugin in backend is industrial surface
  if (backendIndex.includes('aasPlugin')) {
    backendLoadedIds.add('nexora-industrial');
  }

  const entries = fs.existsSync(pluginsDir)
    ? fs.readdirSync(pluginsDir, { withFileTypes: true })
    : [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const pkgPath = path.join(pluginsDir, entry.name, 'package.json');
    const pkg = readJson<PackageJsonLike>(pkgPath);
    if (!pkg?.name || !pkg.backstage?.role) {
      continue;
    }
    const role = pkg.backstage.role;
    if (!FRONTEND_ROLES.has(role) && !BACKEND_ROLES.has(role)) {
      continue;
    }

    const pluginId =
      pkg.backstage.pluginId ||
      mapImportToPluginId(entry.name.replace(/^plugin-/, ''));

    const existing = byId.get(pluginId) ?? {
      id: pluginId,
      name: DEFAULTS[pluginId]?.name ?? titleCaseId(pluginId),
      type: (DEFAULTS[pluginId]?.type ?? 'PLATFORM') as PluginType,
      lifecycle: (DEFAULTS[pluginId]?.lifecycle ?? 'ENABLED') as PluginLifecycle,
      source: 'WORKSPACE' as const,
      validationStatus: (DEFAULTS[pluginId]?.validationStatus ??
        'NOT_ESTABLISHED') as PluginValidationStatus,
      presentInWorkspace: true,
      permissions: DEFAULTS[pluginId]?.permissions,
      owner: DEFAULTS[pluginId]?.owner,
      frontendRoute: DEFAULTS[pluginId]?.frontendRoute,
      backendRoute: DEFAULTS[pluginId]?.backendRoute,
      validationReference: DEFAULTS[pluginId]?.validationReference,
      experimental: DEFAULTS[pluginId]?.experimental,
      description: pkg.description ?? DEFAULTS[pluginId]?.description,
    };

    if (FRONTEND_ROLES.has(role)) {
      existing.frontendPackage = pkg.name;
      existing.version = existing.version ?? pkg.version;
      if (pkg.description) {
        existing.description = pkg.description;
      }
    }
    if (BACKEND_ROLES.has(role)) {
      existing.backendPackage = pkg.name;
      existing.version = existing.version ?? pkg.version;
    }

    const manifest =
      readManifest(path.join(pluginsDir, entry.name, 'plugin.yaml'), logger) ??
      (FRONTEND_ROLES.has(role)
        ? undefined
        : readManifest(
            path.join(
              pluginsDir,
              entry.name.replace(/-backend$/, ''),
              'plugin.yaml',
            ),
            logger,
          ));

    if (manifest) {
      applyManifest(existing, manifest);
      existing.source = existing.source === 'BACKSTAGE_CORE' ? existing.source : 'MANIFEST';
    } else if (DEFAULTS[pluginId]) {
      Object.assign(existing, {
        ...DEFAULTS[pluginId],
        frontendPackage: existing.frontendPackage,
        backendPackage: existing.backendPackage,
        version: existing.version,
        presentInWorkspace: true,
        source: 'WORKSPACE',
      });
    }

    byId.set(pluginId, existing);
  }

  for (const plugin of byId.values()) {
    plugin.frontendLoaded = frontendLoadedIds.has(plugin.id);
    plugin.backendLoaded = backendLoadedIds.has(plugin.id);
    plugin.runtimeLoaded = Boolean(plugin.frontendLoaded || plugin.backendLoaded);
    if (!plugin.lifecycle) {
      plugin.lifecycle = plugin.runtimeLoaded ? 'ENABLED' : 'DEVELOPMENT';
    }
    // Present but neither FE nor BE loaded → DEVELOPMENT unless explicitly set
    if (
      plugin.presentInWorkspace &&
      !plugin.runtimeLoaded &&
      plugin.lifecycle === 'ENABLED' &&
      !plugin.id.startsWith('backstage')
    ) {
      // Keep ENABLED only if explicitly in defaults as ENABLED with partial load;
      // if truly unloaded, mark DEVELOPMENT.
      const hasDefault = Boolean(DEFAULTS[plugin.id]);
      if (!hasDefault) {
        plugin.lifecycle = 'DEVELOPMENT';
      }
    }
  }

  const backstageJson = readJson<{ version?: string }>(
    path.join(workspaceRoot, 'backstage.json'),
  );
  const coreVersion = backstageJson?.version ?? 'unknown';
  byId.set('backstage-core', {
    id: 'backstage-core',
    name: 'Backstage Core',
    description:
      'Third-party platform dependency. Controlled through SOUP/dependency management. Not GxP validated.',
    version: coreVersion,
    type: 'PLATFORM',
    lifecycle: 'ENABLED',
    source: 'BACKSTAGE_CORE',
    validationStatus: 'NOT_APPLICABLE',
    validationReference: 'Controlled through SOUP/dependency management',
    runtimeLoaded: true,
    frontendLoaded: true,
    backendLoaded: true,
    presentInWorkspace: false,
    owner: 'upstream',
    dependencies: [
      '@backstage/backend-defaults',
      '@backstage/frontend-defaults',
      '@backstage/plugin-catalog',
      '@backstage/plugin-scaffolder',
    ],
  });

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function applyManifest(
  target: NexoraPluginDescriptor,
  manifest: PluginManifestFile,
): void {
  if (manifest.id && manifest.id !== target.id) {
    // Keep discovered id as source of truth for pairing
  }
  if (manifest.name) target.name = manifest.name;
  if (manifest.description) target.description = manifest.description;
  if (manifest.type) target.type = manifest.type;
  if (manifest.lifecycle) target.lifecycle = manifest.lifecycle;
  if (manifest.frontend?.package) target.frontendPackage = manifest.frontend.package;
  if (manifest.frontend?.route) target.frontendRoute = manifest.frontend.route;
  if (manifest.backend?.package) target.backendPackage = manifest.backend.package;
  if (manifest.backend?.route) target.backendRoute = manifest.backend.route;
  if (manifest.owner) target.owner = manifest.owner;
  if (manifest.permissions) target.permissions = manifest.permissions;
  if (manifest.validation?.status) {
    target.validationStatus = manifest.validation.status;
  }
  if (manifest.validation?.reference) {
    target.validationReference = manifest.validation.reference;
  }
  if (manifest.dependencies) target.dependencies = manifest.dependencies;
  if (typeof manifest.experimental === 'boolean') {
    target.experimental = manifest.experimental;
  }
}

export function filterPlugins(
  items: NexoraPluginDescriptor[],
  query: {
    q?: string;
    type?: string;
    lifecycle?: string;
    validationStatus?: string;
  },
): NexoraPluginDescriptor[] {
  const q = query.q?.trim().toLowerCase();
  return items.filter(item => {
    if (query.type && item.type !== query.type) return false;
    if (query.lifecycle && item.lifecycle !== query.lifecycle) return false;
    if (query.validationStatus && item.validationStatus !== query.validationStatus) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      item.id,
      item.name,
      item.description,
      item.frontendPackage,
      item.backendPackage,
      item.owner,
      item.type,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
