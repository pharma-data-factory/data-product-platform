/**
 * Artifact installations (NXD-129, NXD-139).
 *
 * An installation is governed desired state: a released artifact version, at
 * the image digest its release recorded, meant for one runtime target, with
 * configuration validated against the manifest's `spec.config`. A runtime
 * provider outside the Backstage backend executes it and reports what it
 * observes (NXD-129 slices 2 and 3).
 *
 * Named `ArtifactInstallation` and `RuntimeTarget` on purpose. `NXD-078`'s
 * `InstallationIdentity` is the identity of a *Nexora instance*; a runtime
 * target is a place a provider runs workloads. The two must not share a name
 * or a table, so neither type is called plain `Installation` or `Target`.
 *
 * The shapes and the pure rules live here, beside `artifact.ts`, so the store,
 * a later Install page and a later provider read one definition. The canonical
 * configuration form and its hash in particular must be computed identically
 * by the store (desired) and by a provider (observed), or an IQ comparing the
 * two would compare two different things.
 */

import { createHash } from 'crypto';
import type { ConfigKeySchema } from './platform-component-library';
import type { ArtifactRuntime } from './artifact';

/** The three acts that change an installation's desired state. */
export const INSTALLATION_ACTS = ['INSTALL', 'UPGRADE', 'REMOVE'] as const;
export type InstallationAct = (typeof INSTALLATION_ACTS)[number];

/** What the installation is meant to be on its target. */
export const INSTALLATION_DESIRED_STATES = ['PRESENT', 'ABSENT'] as const;
export type InstallationDesiredState =
  (typeof INSTALLATION_DESIRED_STATES)[number];

/**
 * What a provider last reported. Written only by the provider API
 * (NXD-143); until a provider reports, an installation has no
 * observed state at all, which is not the same as `UNKNOWN`.
 */
export const INSTALLATION_OBSERVED_STATES = [
  'UNKNOWN',
  'PENDING',
  'RUNNING',
  'DEGRADED',
  'STOPPED',
  'FAILED',
  'ABSENT',
] as const;
export type InstallationObservedState =
  (typeof INSTALLATION_OBSERVED_STATES)[number];

/**
 * Installation qualification (IQ), the user's QA decision of 2026-10-07
 * (NXD-139).
 *
 * - `NOT_REQUIRED`: the product is not GMP-relevant.
 * - `PENDING_EVIDENCE`: GMP-relevant; the provider has not yet reported the
 *   facts an IQ is made from (running digest, config hash, target).
 * - `EVIDENCE_RECORDED`: the provider's facts are on the IQ record and match
 *   the desired state; QA has not signed.
 * - `QUALIFIED`: QA has signed the IQ. Only now is the installation qualified.
 *
 * Acts write `NOT_REQUIRED` and `PENDING_EVIDENCE`; a provider's report that
 * matches the desire writes `EVIDENCE_RECORDED` (NXD-143). QA's sign-off,
 * the only way to `QUALIFIED`, is a later slice.
 */
export const INSTALLATION_QUALIFICATION_STATUSES = [
  'NOT_REQUIRED',
  'PENDING_EVIDENCE',
  'EVIDENCE_RECORDED',
  'QUALIFIED',
] as const;
export type InstallationQualificationStatus =
  (typeof INSTALLATION_QUALIFICATION_STATUSES)[number];

/**
 * Where an act's GMP classification came from.
 *
 * - `PRODUCT`: a Composer product governs the artifact (its versions carry
 *   the coordinate as `artifactRef`, NXD-137); its `gxpRelevance` decides,
 *   NONE being the only answer that is not GMP-relevant (NXD-128).
 * - `NO_PRODUCT`: the Composer answered that no product governs the
 *   artifact — a community or listing artifact. GMP-relevant (NXD-140):
 *   nobody has answered the GxP question for it, and an unanswered
 *   question counts as GMP, as it does on a product (NXD-128).
 * - `UNAVAILABLE`: the Composer could not answer. Treated as GMP-relevant,
 *   so an outage asks for more, never for less.
 */
export const GMP_CLASSIFICATION_SOURCES = [
  'PRODUCT',
  'NO_PRODUCT',
  'UNAVAILABLE',
] as const;
export type GmpClassificationSource =
  (typeof GMP_CLASSIFICATION_SOURCES)[number];

/** A secret is held by reference, never by value. */
export interface SecretReference {
  secretRef: string;
}

export type InstallationConfigValue = string | SecretReference;

/**
 * Validated configuration: every value is a string, the form an environment
 * variable has, except a secret, which is only a reference the provider
 * resolves on its target.
 */
export type InstallationConfig = Record<string, InstallationConfigValue>;

/**
 * The name of a secret in the target's secret store: lowercase segments
 * separated by `/`, `.` or `_`, at most 253 characters. Narrow on purpose:
 * most literal passwords and tokens do not match it, so a value pasted into
 * the reference field is refused rather than stored.
 */
const SECRET_REF_PATTERN = /^[a-z0-9]+(?:[-._/][a-z0-9]+)*$/;

export function isSecretReference(value: unknown): value is SecretReference {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    typeof (value as { secretRef?: unknown }).secretRef === 'string'
  );
}

export function isValidSecretRef(ref: string): boolean {
  return ref.length <= 253 && SECRET_REF_PATTERN.test(ref);
}

function isNumeric(value: string): boolean {
  return value.trim() !== '' && Number.isFinite(Number(value));
}

function isUrl(value: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return /^[a-z][a-z0-9+.-]*:/i.test(value);
  } catch {
    return false;
  }
}

/**
 * Validates installation configuration against a manifest's `spec.config`.
 *
 * Returns the normalised configuration and every issue found, so a refusal
 * names all of them at once:
 * - a key the manifest does not declare is refused;
 * - a required key without a value and without a `defaultValue` is refused;
 * - `number`, `boolean` and `url` values must be what they say; numbers and
 *   booleans are stored as the string an environment variable would carry;
 * - a `secret` must be `{ secretRef }`; a literal value is refused, and is
 *   not echoed in the message;
 * - a non-secret key may not carry a `secretRef`.
 *
 * Defaults are not copied in: the manifest's `defaultValue` stays the
 * manifest's, and the stored configuration is what the installer chose.
 */
export function validateInstallationConfig(
  schema: readonly ConfigKeySchema[] | undefined,
  input: unknown,
): { config: InstallationConfig; issues: string[] } {
  const issues: string[] = [];
  const config: InstallationConfig = {};
  const declared = new Map((schema ?? []).map(entry => [entry.key, entry]));

  if (input !== undefined && input !== null) {
    if (typeof input !== 'object' || Array.isArray(input)) {
      return {
        config,
        issues: ['config must be an object of key to value'],
      };
    }
  }
  const values = (input ?? {}) as Record<string, unknown>;

  for (const [key, raw] of Object.entries(values)) {
    const entry = declared.get(key);
    if (!entry) {
      issues.push(`config.${key} is not declared in the manifest's spec.config`);
      continue;
    }
    if (entry.type === 'secret') {
      if (!isSecretReference(raw)) {
        issues.push(
          `config.${key} is a secret: give a reference ({ "secretRef": "<name>" }), ` +
            'never the value',
        );
        continue;
      }
      if (!isValidSecretRef(raw.secretRef)) {
        // The reference is not echoed either: a value pasted into the wrong
        // field is still a value.
        issues.push(
          `config.${key}.secretRef is not a secret name (lowercase segments ` +
            'separated by "/", ".", "-" or "_")',
        );
        continue;
      }
      config[key] = { secretRef: raw.secretRef };
      continue;
    }
    if (isSecretReference(raw)) {
      issues.push(`config.${key} is a ${entry.type}, not a secret; give its value`);
      continue;
    }
    if (
      typeof raw !== 'string' &&
      typeof raw !== 'number' &&
      typeof raw !== 'boolean'
    ) {
      issues.push(`config.${key} must be a ${entry.type} value`);
      continue;
    }
    const text = String(raw);
    if (entry.type === 'number' && !isNumeric(text)) {
      issues.push(`config.${key} must be a number`);
      continue;
    }
    if (entry.type === 'boolean' && text !== 'true' && text !== 'false') {
      issues.push(`config.${key} must be true or false`);
      continue;
    }
    if (entry.type === 'url' && !isUrl(text)) {
      issues.push(`config.${key} must be a URL`);
      continue;
    }
    config[key] = text;
  }

  for (const entry of declared.values()) {
    if (
      entry.required &&
      config[entry.key] === undefined &&
      entry.defaultValue === undefined &&
      !issues.some(issue => issue.startsWith(`config.${entry.key}`))
    ) {
      issues.push(`config.${entry.key} is required`);
    }
  }

  return { config, issues };
}

/**
 * The canonical form of a configuration: keys sorted, values as stored.
 * The store hashes the desired configuration with it, and a provider hashes
 * what it applied with it; the IQ compares the two.
 */
export function canonicalInstallationConfig(config: InstallationConfig): string {
  const sorted: Record<string, InstallationConfigValue> = {};
  for (const key of Object.keys(config).sort()) {
    const value = config[key];
    sorted[key] =
      typeof value === 'string' ? value : { secretRef: value.secretRef };
  }
  return JSON.stringify(sorted);
}

/** `sha256:<64 hex>` of the canonical configuration. */
export function computeInstallationConfigHash(config: InstallationConfig): string {
  return `sha256:${createHash('sha256')
    .update(canonicalInstallationConfig(config), 'utf8')
    .digest('hex')}`;
}

/**
 * How a target's provider authenticates to one container registry (NXD-147):
 * a reference into the target's secret store, never the credential. The
 * provider resolves it where it runs, as it resolves a configuration secret.
 */
export interface RegistryCredentialRef {
  /** Registry host, e.g. `ghcr.io`, `registry.example.com:5000`. */
  registry: string;
  /** Login name; registries that accept a token ignore it. */
  username?: string;
  /** The secret holding the password or token. */
  secretRef: string;
}

const REGISTRY_HOST_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*(?::\d{1,5})?$/;
const REGISTRY_USERNAME_PATTERN = /^[A-Za-z0-9._@-]{1,128}$/;

/**
 * Validates a target's registry credentials: each a registry host, an
 * optional user name and a secret *reference*. One entry per registry.
 */
export function validateRegistryCredentials(
  input: unknown,
): { credentials: RegistryCredentialRef[]; issues: string[] } {
  if (input === undefined || input === null) return { credentials: [], issues: [] };
  if (!Array.isArray(input)) {
    return { credentials: [], issues: ['registryCredentials must be a list'] };
  }
  const issues: string[] = [];
  const credentials: RegistryCredentialRef[] = [];
  const seen = new Set<string>();
  input.forEach((raw, i) => {
    const at = `registryCredentials[${i}]`;
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      issues.push(`${at} must be an object`);
      return;
    }
    const entry = raw as Record<string, unknown>;
    const unknownKeys = Object.keys(entry).filter(
      k => !['registry', 'username', 'secretRef'].includes(k),
    );
    if (unknownKeys.length > 0) {
      // A key such as `password` is refused without echoing its value.
      issues.push(`${at} may hold registry, username and secretRef only (got ${unknownKeys.join(', ')})`);
      return;
    }
    const registry = String(entry.registry ?? '').trim().toLowerCase();
    if (!REGISTRY_HOST_PATTERN.test(registry)) {
      issues.push(`${at}.registry must be a registry host such as ghcr.io`);
      return;
    }
    if (seen.has(registry)) {
      issues.push(`${at}.registry ${registry} is listed twice`);
      return;
    }
    const secretRef = String(entry.secretRef ?? '');
    if (!isValidSecretRef(secretRef)) {
      issues.push(
        `${at}.secretRef is not a secret name (lowercase segments separated by "/", ".", "-" or "_")`,
      );
      return;
    }
    const username = entry.username === undefined ? undefined : String(entry.username).trim();
    if (username !== undefined && !REGISTRY_USERNAME_PATTERN.test(username)) {
      issues.push(`${at}.username must be a login name`);
      return;
    }
    seen.add(registry);
    credentials.push({ registry, secretRef, ...(username ? { username } : {}) });
  });
  return { credentials: issues.length > 0 ? [] : credentials, issues };
}

/**
 * The registry host of an image repository, as Docker resolves it: the first
 * path segment when it looks like a host, otherwise Docker Hub.
 */
export function registryHostOf(imageRepository: string): string {
  const first = imageRepository.split('/')[0];
  return imageRepository.includes('/') && (first.includes('.') || first.includes(':') || first === 'localhost')
    ? first.toLowerCase()
    : 'docker.io';
}

/** A place a runtime provider runs workloads. Not a Nexora instance (NXD-078). */
export interface RuntimeTarget {
  id: string;
  /** Unique, a coordinate segment. */
  name: string;
  displayName: string;
  description?: string;
  /** Which provider technology executes here, e.g. `docker-compose`. */
  providerKind: string;
  /**
   * The `backend.auth.externalAccess` subject of the provider that may read
   * this target's desired state and report observed state (NXD-087 pattern,
   * NXD-129 slice 2). Unset until a provider is bound.
   */
  providerSubject?: string;
  /** How the provider authenticates to private registries (NXD-147). */
  registryCredentials?: RegistryCredentialRef[];
  createdBy: string;
  createdAt: Date;
  revision: number;
}

export interface InstallationDesired {
  state: InstallationDesiredState;
  /** `namespace/name@version`. */
  artifactRef: string;
  version: string;
  artifactVersionId: string;
  /** From the version's release build (NXD-137), never from the request. */
  imageRepository: string;
  imageDigest: string;
  config: InstallationConfig;
  configHash: string;
  /**
   * Increases with every act. A provider reports which desired revision it
   * applied, so observed state can be matched to the desire it answers.
   */
  revision: number;
  changedBy: string;
  changedAt: Date;
}

/** What a provider reports. Absent until one does (NXD-143). */
export interface InstallationObserved {
  state: InstallationObservedState;
  desiredRevision?: number;
  imageDigest?: string;
  configHash?: string;
  message?: string;
  reportedBy: string;
  reportedAt: Date;
}

export interface ArtifactInstallation {
  id: string;
  targetId: string;
  /** Unique on its target; defaults to the artifact name. */
  name: string;
  namespace: string;
  artifactName: string;
  desired: InstallationDesired;
  observed?: InstallationObserved;
  /** As classified at the last act. */
  gmpRelevant: boolean;
  gmpClassificationSource: GmpClassificationSource;
  qualificationStatus: InstallationQualificationStatus;
  createdBy: string;
  createdAt: Date;
  revision: number;
}

/**
 * One install, upgrade or removal, as attested. Append-only, like
 * `product_signatures` (NXD-128): a GMP-relevant act carries a justification
 * and the verified second factor; any other act a confirmation.
 */
export interface InstallationActRecord {
  id: string;
  installationId: string;
  act: InstallationAct;
  desiredRevision: number;
  artifactRef: string;
  imageDigest: string;
  configHash: string;
  justification: string;
  signedBy: string;
  signedAt: string;
  gmpRelevant: boolean;
  gmpClassificationSource: GmpClassificationSource;
  /** The verified second factor; absent for a confirmation. */
  reauthMethod?: string;
}

/**
 * The IQ record of one desired revision of a GMP-relevant installation.
 * Created `PENDING_EVIDENCE` by an install or upgrade (NXD-139); the evidence
 * fields are filled from a matching provider report (NXD-143), the sign-off
 * by QA in a later slice.
 */
export interface InstallationQualification {
  id: string;
  installationId: string;
  desiredRevision: number;
  status: Exclude<InstallationQualificationStatus, 'NOT_REQUIRED'>;
  expectedImageDigest: string;
  expectedConfigHash: string;
  expectedTargetId: string;
  observedImageDigest?: string;
  observedConfigHash?: string;
  observedTargetId?: string;
  evidenceRecordedBy?: string;
  evidenceRecordedAt?: Date;
  qualifiedBy?: string;
  qualifiedAt?: Date;
  /** The act record of QA's signature, once there is one. */
  qualificationActId?: string;
  createdAt: Date;
  revision: number;
}

/** What a person sends with an act. */
export interface InstallationSignatureInput {
  justification?: string;
  /** The signing PIN; required for a GMP-relevant product. */
  pin?: string;
  /** Required for a product that is not GMP-relevant. */
  confirmed?: boolean;
}

// ---------------------------------------------------------------------------
// Provider API (NXD-129 slice 2, NXD-143)
// ---------------------------------------------------------------------------

/**
 * One installation as its target's provider reads it: the desired state, and
 * the released manifest's `spec.runtime` (ports, health, resources, storage)
 * and `spec.config`, so the provider needs no second credential for the
 * registry.
 *
 * `blocked` names why the provider must not apply this desire — the version
 * it pins is no longer the one the registry answers for it — and is absent
 * otherwise. A blocked installation is listed, not hidden, so a provider can
 * report it rather than silently skip it.
 */
export interface ProviderDesiredInstallation {
  id: string;
  name: string;
  namespace: string;
  artifactName: string;
  gmpRelevant: boolean;
  desired: InstallationDesired;
  runtime?: ArtifactRuntime;
  /**
   * The released manifest's `spec.config` (NXD-144). The stored
   * configuration holds only what the installer chose; a key left out takes
   * its `defaultValue` from here, which the provider applies and does not
   * hash.
   */
  configSchema?: ConfigKeySchema[];
  blocked?: string;
}

/** `GET /provider/targets/:targetId/desired`. */
export interface ProviderDesiredState {
  target: Pick<RuntimeTarget, 'id' | 'name' | 'providerKind' | 'registryCredentials'>;
  installations: ProviderDesiredInstallation[];
  generatedAt: string;
}

/** `POST /provider/targets/:targetId/installations/:id/observed`. */
export interface ObservedStateReport {
  state: InstallationObservedState;
  /** The desired revision this observation answers. */
  desiredRevision: number;
  /** The digest of the image actually running, `sha256:<64 hex>`. */
  imageDigest?: string;
  /** `computeInstallationConfigHash` of the configuration actually applied. */
  configHash?: string;
  message?: string;
}

const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;
const OBSERVED_MESSAGE_MAX = 1000;

/**
 * Validates a provider's report. Returns the normalised report, or every
 * issue found. Whether the revision exists is the store's question, not
 * this function's.
 */
export function validateObservedStateReport(
  input: unknown,
): { report?: ObservedStateReport; issues: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { issues: ['the report must be an object'] };
  }
  const raw = input as Record<string, unknown>;
  const issues: string[] = [];
  const state = raw.state as InstallationObservedState;
  if (!INSTALLATION_OBSERVED_STATES.includes(state)) {
    issues.push(`state must be one of ${INSTALLATION_OBSERVED_STATES.join(', ')}`);
  }
  const desiredRevision = raw.desiredRevision;
  if (
    typeof desiredRevision !== 'number' ||
    !Number.isInteger(desiredRevision) ||
    desiredRevision < 1
  ) {
    issues.push('desiredRevision must be a positive integer');
  }
  for (const key of ['imageDigest', 'configHash'] as const) {
    const value = raw[key];
    if (value !== undefined && (typeof value !== 'string' || !SHA256_PATTERN.test(value))) {
      issues.push(`${key} must be sha256:<64 lowercase hex>`);
    }
  }
  if (raw.message !== undefined && typeof raw.message !== 'string') {
    issues.push('message must be a string');
  }
  if (issues.length > 0) return { issues };
  const message =
    typeof raw.message === 'string'
      ? raw.message.trim().slice(0, OBSERVED_MESSAGE_MAX)
      : '';
  return {
    report: {
      state,
      desiredRevision: desiredRevision as number,
      ...(raw.imageDigest ? { imageDigest: raw.imageDigest as string } : {}),
      ...(raw.configHash ? { configHash: raw.configHash as string } : {}),
      ...(message ? { message } : {}),
    },
    issues: [],
  };
}
