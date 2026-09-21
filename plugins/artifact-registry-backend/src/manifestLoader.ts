/**
 * Loads `nexora.yaml` manifests from disk into the registry at startup.
 *
 * This is what makes "manifest driven" true rather than aspirational: a
 * capability enters the registry by being a file, not by being a branch in
 * platform code. The loader itself knows nothing about what it is loading —
 * it reads documents, dispatches on `kind`, and hands them to the service,
 * which applies the same rules an HTTP caller would meet.
 *
 * Three properties matter more than throughput here.
 *
 * Idempotent: a coordinate that is already registered is skipped, not
 * re-registered and not treated as an error. A backend restarts often, and a
 * loader that duplicates or throws on the second run is worse than no loader.
 *
 * Non-fatal: a malformed manifest is reported and the rest still load, and a
 * failure of the whole load never stops the backend from starting. Twelve
 * legacy offerings must not be able to take the platform down.
 *
 * Draft-only: nothing here publishes. Registration yields DRAFT, so loading a
 * file can never by itself make content available to consumers — the same
 * guarantee the HTTP route gives.
 */

import { existsSync } from 'fs';
import { readdir, readFile } from 'fs/promises';
import { dirname, isAbsolute, join, resolve } from 'path';
import { parse as parseYaml } from 'yaml';
import {
  ARTIFACT_MANIFEST_API_VERSION,
  isArtifactSegment,
} from '@internal/platform-common';
import type { ArtifactRegistryService } from './service';

/** The `kind` a publisher declaration carries. Not an ArtifactKind. */
export const PUBLISHER_MANIFEST_KIND = 'Publisher';

export interface PublisherManifest {
  apiVersion: string;
  kind: typeof PUBLISHER_MANIFEST_KIND;
  metadata: {
    namespace: string;
    displayName: string;
    description?: string;
  };
  spec?: {
    memberGroups?: string[];
  };
}

export interface ManifestLoadResult {
  publishersCreated: number;
  publishersSkipped: number;
  versionsRegistered: number;
  versionsSkipped: number;
  /** One entry per document that could not be loaded, with the reason. */
  failures: { path: string; reason: string }[];
}

const EMPTY_RESULT: ManifestLoadResult = {
  publishersCreated: 0,
  publishersSkipped: 0,
  versionsRegistered: 0,
  versionsSkipped: 0,
  failures: [],
};

/** Minimal logger shape, so tests need no Backstage service. */
export interface ManifestLoaderLogger {
  info(message: string): void;
  warn(message: string): void;
}

export interface LoadManifestsOptions {
  directory: string;
  service: ArtifactRegistryService;
  logger: ManifestLoaderLogger;
  /** Recorded as `createdBy` on everything this loader creates. */
  actor?: string;
}

export const MANIFEST_LOADER_ACTOR = 'system:artifact-manifest-loader';

/**
 * Resolves a repo-relative manifest directory against the actual working
 * directory.
 *
 * `yarn start` from the repo root runs the backend with cwd at the root;
 * `backstage-cli package start` runs it with cwd at `packages/backend`. A path
 * like `catalog/artifacts` is therefore correct from one and wrong from the
 * other. Walking up to the first candidate that exists covers both without the
 * deployment having to know which one it is.
 *
 * The same problem is solved the same way by `resolveFactoryPath` in
 * `model-company-backend`. Two copies is one too many; a third caller should
 * be the trigger to move this into `platform-common` rather than copy it
 * again.
 */
export function resolveManifestDirectory(
  configured: string,
  from: string = process.cwd(),
): string {
  if (isAbsolute(configured)) {
    return configured;
  }
  let directory = from;
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = resolve(directory, configured);
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(directory);
    if (parent === directory) {
      break;
    }
    directory = parent;
  }
  // Nothing found. Return the cwd-relative path so the loader reports a
  // missing directory against the location the operator most likely meant.
  return resolve(from, configured);
}

interface LoadedDocument {
  path: string;
  document: unknown;
}

/**
 * Registers every manifest under `directory`.
 *
 * A missing directory is not an error — an installation that ships no
 * manifests is a legitimate installation, and requiring the directory to exist
 * would make the loader a configuration burden for every test and every
 * deployment that does not use it.
 */
export async function loadManifestsFromDisk(
  options: LoadManifestsOptions,
): Promise<ManifestLoadResult> {
  const { directory, service, logger } = options;
  const actor = options.actor ?? MANIFEST_LOADER_ACTOR;

  const files = await listYamlFiles(directory);
  if (files === undefined) {
    logger.info(
      `Artifact manifest directory ${directory} does not exist; nothing to load`,
    );
    return { ...EMPTY_RESULT };
  }

  const result: ManifestLoadResult = { ...EMPTY_RESULT, failures: [] };
  const publishers: LoadedDocument[] = [];
  const artifacts: LoadedDocument[] = [];

  for (const path of files) {
    let document: unknown;
    try {
      document = parseYaml(await readFile(path, 'utf8'));
    } catch (error) {
      result.failures.push({ path, reason: describe(error) });
      continue;
    }
    if (!isMapping(document)) {
      result.failures.push({ path, reason: 'Manifest must be a YAML mapping' });
      continue;
    }
    if ((document as Record<string, unknown>).kind === PUBLISHER_MANIFEST_KIND) {
      publishers.push({ path, document });
    } else {
      artifacts.push({ path, document });
    }
  }

  // Publishers first: registering into a namespace no publisher owns is
  // refused by the service, and rightly so.
  for (const entry of publishers) {
    await loadPublisher(entry, service, actor, result);
  }
  await loadArtifacts(artifacts, service, actor, result);

  logger.info(
    `Artifact manifests: ${result.versionsRegistered} registered, ` +
      `${result.versionsSkipped} already present, ` +
      `${result.publishersCreated} publishers created, ` +
      `${result.failures.length} failed`,
  );
  for (const failure of result.failures) {
    logger.warn(
      `Artifact manifest ${failure.path} was not loaded: ${failure.reason}`,
    );
  }

  return result;
}

async function loadPublisher(
  entry: LoadedDocument,
  service: ArtifactRegistryService,
  actor: string,
  result: ManifestLoadResult,
): Promise<void> {
  const issues = validatePublisherManifest(entry.document);
  if (issues.length > 0) {
    result.failures.push({ path: entry.path, reason: issues.join('; ') });
    return;
  }
  const manifest = entry.document as PublisherManifest;
  const existing = await service.getPublisherByNamespace(
    manifest.metadata.namespace,
  );
  if (existing) {
    result.publishersSkipped += 1;
    return;
  }
  try {
    await service.createPublisher(
      {
        namespace: manifest.metadata.namespace,
        displayName: manifest.metadata.displayName,
        description: manifest.metadata.description,
        memberGroups: manifest.spec?.memberGroups,
      },
      actor,
    );
    result.publishersCreated += 1;
  } catch (error) {
    result.failures.push({ path: entry.path, reason: describe(error) });
  }
}

/**
 * Registers artifact manifests, retrying until no further progress is made.
 *
 * A manifest may depend on an exact version of another ([`NXD-013`]), and the
 * service refuses a version whose dependencies do not resolve. Rather than
 * topologically sorting — which would need dependency parsing the service
 * already does — the loader simply runs passes until a pass registers nothing
 * new. Whatever is left then genuinely cannot be registered, and its real
 * error is reported rather than an ordering artefact.
 */
async function loadArtifacts(
  entries: LoadedDocument[],
  service: ArtifactRegistryService,
  actor: string,
  result: ManifestLoadResult,
): Promise<void> {
  let remaining = entries;

  while (remaining.length > 0) {
    const deferred: LoadedDocument[] = [];
    const errors = new Map<string, string>();

    for (const entry of remaining) {
      const coordinate = coordinateOf(entry.document);
      if (coordinate) {
        const already = await service.resolve(coordinate);
        if (already) {
          result.versionsSkipped += 1;
          continue;
        }
      }
      try {
        await service.registerArtifactVersion(entry.document, actor);
        result.versionsRegistered += 1;
      } catch (error) {
        deferred.push(entry);
        errors.set(entry.path, describe(error));
      }
    }

    if (deferred.length === remaining.length) {
      // No progress this pass, so another one cannot help.
      for (const entry of deferred) {
        result.failures.push({
          path: entry.path,
          reason: errors.get(entry.path) ?? 'unknown error',
        });
      }
      return;
    }
    remaining = deferred;
  }
}

/** The coordinate a document claims, if it claims one legibly. */
function coordinateOf(
  document: unknown,
): { namespace: string; name: string; version: string } | undefined {
  if (!isMapping(document)) {
    return undefined;
  }
  const metadata = (document as Record<string, unknown>).metadata;
  if (!isMapping(metadata)) {
    return undefined;
  }
  const meta = metadata as Record<string, unknown>;
  const { namespace, name, version } = meta;
  if (
    typeof namespace !== 'string' ||
    typeof name !== 'string' ||
    typeof version !== 'string'
  ) {
    return undefined;
  }
  return { namespace, name, version };
}

export function validatePublisherManifest(input: unknown): string[] {
  const issues: string[] = [];
  if (!isMapping(input)) {
    return ['Publisher manifest must be a YAML mapping'];
  }
  const manifest = input as Record<string, unknown>;

  if (manifest.apiVersion !== ARTIFACT_MANIFEST_API_VERSION) {
    issues.push(
      `Unsupported apiVersion "${String(manifest.apiVersion ?? '')}": ` +
        `expected ${ARTIFACT_MANIFEST_API_VERSION}`,
    );
  }
  const metadata = manifest.metadata;
  if (!isMapping(metadata)) {
    issues.push('metadata is required');
    return issues;
  }
  const meta = metadata as Record<string, unknown>;

  if (typeof meta.namespace !== 'string' || !isArtifactSegment(meta.namespace)) {
    issues.push(
      `metadata.namespace "${String(meta.namespace ?? '')}" must be lowercase ` +
        `alphanumeric with single inner hyphens`,
    );
  }
  if (typeof meta.displayName !== 'string' || !meta.displayName.trim()) {
    issues.push('metadata.displayName is required');
  }

  const spec = manifest.spec;
  if (spec !== undefined) {
    if (!isMapping(spec)) {
      issues.push('spec must be a mapping');
    } else {
      const groups = (spec as Record<string, unknown>).memberGroups;
      if (
        groups !== undefined &&
        !(Array.isArray(groups) && groups.every(g => typeof g === 'string'))
      ) {
        issues.push('spec.memberGroups must be a list of strings');
      }
    }
  }

  return issues;
}

/** Every `.yaml` under `directory`, sorted, or undefined if it is absent. */
async function listYamlFiles(directory: string): Promise<string[] | undefined> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }

  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...((await listYamlFiles(path)) ?? []));
    } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
      files.push(path);
    }
  }
  // Sorted so a load is reproducible and a failure list is stable.
  return files.sort();
}

function isMapping(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
