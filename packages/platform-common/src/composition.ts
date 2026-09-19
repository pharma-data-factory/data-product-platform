import { isArtifactManifest, type ArtifactManifest } from './artifact';
import {
  PlatformComponent,
  findPlatformComponent,
  isDeprecatedPlatformComponent,
  isSupportedPlatformComponent,
  isValidVersionConstraint,
  normalizeEntityRef,
  versionSatisfiesConstraint,
} from './platform-components';

export const GOLDEN_PATH_COMPOSITION_API_VERSION = 'dataprod.platform/v1alpha1';
export const GOLDEN_PATH_COMPOSITION_KIND = 'GoldenPathComposition';

export interface GoldenPathCompositionComponent {
  ref: string;
  version: string;
  /** Offered rather than required. Absent means required. */
  optional?: boolean;
}

export interface GoldenPathComposition {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    title?: string;
    description?: string;
  };
  spec: {
    standardVersion?: string;
    components: GoldenPathCompositionComponent[];
  };
}

export type CompositionIssueCode =
  | 'PARSE'
  | 'MISSING_COMPONENT'
  | 'UNSUPPORTED_COMPONENT'
  | 'INVALID_VERSION_CONSTRAINT'
  | 'VERSION_INCOMPATIBLE'
  | 'DEPRECATED_COMPONENT'
  | 'STANDARD_INCOMPATIBLE'
  | 'MISSING_DEPENDENCY'
  | 'CONFLICTING_COMPONENTS';

export interface CompositionIssue {
  code: CompositionIssueCode;
  path: string;
  message: string;
}

export interface CompositionValidationResult {
  compatible: boolean;
  issues: CompositionIssue[];
}

export function parseCompositionManifest(text: string): GoldenPathComposition {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Composition manifest is empty');
  }
  if (trimmed.startsWith('{')) {
    return normalizeComposition(JSON.parse(trimmed));
  }
  return normalizeComposition(parseCompositionYaml(trimmed));
}

export function normalizeComposition(raw: unknown): GoldenPathComposition {
  const doc = asRecord(raw);
  const metadata = asRecord(doc.metadata);
  const spec = asRecord(doc.spec);
  const componentsRaw = spec.components;
  if (!Array.isArray(componentsRaw)) {
    throw new Error('Composition spec.components must be an array');
  }
  const name = asString(metadata.name);
  if (!name) {
    throw new Error('Composition metadata.name is required');
  }
  return {
    apiVersion: asString(doc.apiVersion) || GOLDEN_PATH_COMPOSITION_API_VERSION,
    kind: asString(doc.kind) || GOLDEN_PATH_COMPOSITION_KIND,
    metadata: {
      name,
      title: asString(metadata.title) || undefined,
      description: asString(metadata.description) || undefined,
    },
    spec: {
      standardVersion: asString(spec.standardVersion) || '1.0.0',
      components: componentsRaw.map((item, index) => {
        const entry = asRecord(item);
        const ref = asString(entry.ref);
        const version = asString(entry.version);
        if (!ref) {
          throw new Error(`Composition spec.components[${index}].ref is required`);
        }
        if (!version) {
          throw new Error(
            `Composition spec.components[${index}].version is required`,
          );
        }
        return {
          ref,
          version,
          ...(entry.optional === true ? { optional: true } : {}),
        };
      }),
    },
  };
}

/**
 * The composition a GOLDEN_PATH Artifact manifest describes, or nothing.
 *
 * Compositions used to be a manifest family of their own under
 * `catalog/compositions/`, read by no runtime code while Core restated every
 * component list as a TypeScript constant. They are Artifacts now, so the
 * registry loads, versions and serves them like everything else and there is
 * one copy. See NXD-027.
 *
 * The result is a `GoldenPathComposition` rather than a new type so that
 * `validateComposition` and everything downstream of it keep working against
 * the shape they already know. This is the adapter, not a second model.
 */
export function compositionOfArtifactManifest(
  manifest: ArtifactManifest,
): GoldenPathComposition | undefined {
  if (manifest.kind !== 'GOLDEN_PATH' || !isArtifactManifest(manifest)) {
    return undefined;
  }
  const components = manifest.spec?.components;
  if (!components) {
    return undefined;
  }
  return {
    apiVersion: GOLDEN_PATH_COMPOSITION_API_VERSION,
    kind: GOLDEN_PATH_COMPOSITION_KIND,
    metadata: {
      name: manifest.metadata.name,
      title: manifest.metadata.displayName,
      description: manifest.metadata.description,
    },
    spec: {
      standardVersion: manifest.spec?.standardVersion || '1.0.0',
      components: components.map(entry => ({
        ref: entry.ref,
        version: entry.version,
        ...(entry.optional ? { optional: true } : {}),
      })),
    },
  };
}

/**
 * The component refs of a composition, in manifest order.
 *
 * Order is part of the answer: it is how the composition was written down, and
 * consumers render it. Optional components are excluded by default because the
 * required set is what "the composition" means to a caller asking what it must
 * have.
 */
export function compositionComponentRefs(
  composition: GoldenPathComposition,
  options: { includeOptional?: boolean } = {},
): string[] {
  return composition.spec.components
    .filter(entry => options.includeOptional || !entry.optional)
    .map(entry => entry.ref);
}

/** The refs a composition offers but does not require, in manifest order. */
export function optionalCompositionComponentRefs(
  composition: GoldenPathComposition,
): string[] {
  return composition.spec.components
    .filter(entry => entry.optional)
    .map(entry => entry.ref);
}

export function validateComposition(
  composition: GoldenPathComposition,
  catalog: PlatformComponent[],
): CompositionValidationResult {
  const issues: CompositionIssue[] = [];
  if (composition.apiVersion !== GOLDEN_PATH_COMPOSITION_API_VERSION) {
    issues.push({
      code: 'PARSE',
      path: 'apiVersion',
      message: `Unsupported apiVersion ${composition.apiVersion}`,
    });
  }
  if (composition.kind !== GOLDEN_PATH_COMPOSITION_KIND) {
    issues.push({
      code: 'PARSE',
      path: 'kind',
      message: `Unsupported kind ${composition.kind}. This is a version-controlled composition artifact, not a Catalog entity kind.`,
    });
  }

  const selected: PlatformComponent[] = [];
  composition.spec.components.forEach((entry, index) => {
    const path = `spec.components[${index}]`;
    if (!isValidVersionConstraint(entry.version)) {
      issues.push({
        code: 'INVALID_VERSION_CONSTRAINT',
        path: `${path}.version`,
        message: `Version constraint ${entry.version} is not a supported SemVer range`,
      });
    }
    const match = findPlatformComponent(catalog, entry.ref);
    if (!match) {
      issues.push({
        code: 'MISSING_COMPONENT',
        path: `${path}.ref`,
        message: `Platform Component ${entry.ref} is not in the Catalog`,
      });
      return;
    }
    selected.push(match);
    if (isDeprecatedPlatformComponent(match)) {
      issues.push({
        code: 'DEPRECATED_COMPONENT',
        path,
        message: `${match.title} is deprecated and cannot be used in new compositions`,
      });
    }
    if (!isSupportedPlatformComponent(match)) {
      issues.push({
        code: 'UNSUPPORTED_COMPONENT',
        path,
        message: `${match.title} is ${match.certificationStatus} and is not a supported Platform Component`,
      });
    }
    if (
      isValidVersionConstraint(entry.version) &&
      !versionSatisfiesConstraint(match.version, entry.version)
    ) {
      issues.push({
        code: 'VERSION_INCOMPATIBLE',
        path: `${path}.version`,
        message: `${match.title} ${match.version} does not satisfy ${entry.version}`,
      });
    }
    const standardVersion = composition.spec.standardVersion || '1.0.0';
    const compatible = match.compatibleStandardVersions.some(range =>
      versionSatisfiesConstraint(standardVersion, range),
    );
    if (!compatible) {
      issues.push({
        code: 'STANDARD_INCOMPATIBLE',
        path,
        message: `${match.title} is not compatible with Data Product Standard ${standardVersion}`,
      });
    }
  });

  const selectedRefs = new Set(
    composition.spec.components.map(entry => normalizeEntityRef(entry.ref)),
  );
  selected.forEach((component, index) => {
    for (const dependency of component.dependsOn) {
      const normalized = normalizeEntityRef(dependency);
      if (!normalized.startsWith('component:')) {
        continue;
      }
      if (!selectedRefs.has(normalized) && !selectedRefs.has(dependency)) {
        const depName = normalized.slice(normalized.lastIndexOf('/') + 1);
        if (![...selectedRefs].some(ref => ref.endsWith(`/${depName}`))) {
          issues.push({
            code: 'MISSING_DEPENDENCY',
            path: `spec.components[${index}]`,
            message: `${component.title} requires ${dependency}, which is missing from the composition`,
          });
        }
      }
    }
  });

  for (let i = 0; i < selected.length; i += 1) {
    for (let j = i + 1; j < selected.length; j += 1) {
      const left = selected[i];
      const right = selected[j];
      if (conflicts(left, right) || conflicts(right, left)) {
        issues.push({
          code: 'CONFLICTING_COMPONENTS',
          path: 'spec.components',
          message: `${left.title} conflicts with ${right.title}`,
        });
      }
    }
  }

  return {
    compatible: issues.length === 0,
    issues,
  };
}

function parseCompositionYaml(text: string): unknown {
  const apiVersion = matchLine(text, /^apiVersion:\s*(.+)$/m);
  const kind = matchLine(text, /^kind:\s*(.+)$/m);
  const name = matchLine(text, /^\s+name:\s*(.+)$/m);
  const title = matchLine(text, /^\s+title:\s*(.+)$/m);
  const description = matchLine(text, /^\s+description:\s*(.+)$/m);
  const standardVersion = matchLine(text, /^\s+standardVersion:\s*(.+)$/m);
  const components: Array<{ ref: string; version: string }> = [];
  const block = text.split(/components:\s*\n/)[1] ?? '';
  const entries = block.split(/^\s*-\s+/m).slice(1);
  for (const entry of entries) {
    components.push({
      ref: matchLine(entry, /ref:\s*(.+)/),
      version: matchLine(entry, /version:\s*(.+)/),
    });
  }
  return {
    apiVersion,
    kind,
    metadata: { name, title, description },
    spec: { standardVersion, components },
  };
}

function matchLine(text: string, pattern: RegExp): string {
  const match = pattern.exec(text);
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? '';
}

function conflicts(left: PlatformComponent, right: PlatformComponent): boolean {
  return left.conflictsWith.some(value => {
    const normalized = normalizeEntityRef(value);
    return (
      normalized === right.entityRef ||
      value === right.name ||
      normalized.endsWith(`/${right.name}`)
    );
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
