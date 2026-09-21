/**
 * Contract compatibility evaluation — Phase 4 (P4-S5).
 *
 * Checks whether updating a data contract from one version to another is
 * backward-compatible for existing consumers. The rules implement the
 * config/data-product-compatibility-policy.yaml policy — the same policy the
 * Python SDK and the data-products frontend plugin apply. They share a YAML
 * source; this module applies the same rules in TypeScript without importing
 * the JSON copy from any one plugin.
 *
 * Provider-neutral: the comparison operates on `JsonSchemaLike` objects (a
 * typed subset of JSON Schema). Avro and Protobuf compatibility is a later
 * Phase 4 slice — the `schemaType` field in DataContract makes the contract
 * type explicit and the evaluator can be extended per type.
 *
 * The result type uses `'COMPATIBLE' | 'BREAKING_CHANGE' | 'UNKNOWN'`, which
 * is the same vocabulary as `CONTRACT_COMPATIBILITY` in nexora-industrial.ts.
 * It is defined here separately because data exchange compatibility is a
 * platform concept, not an industrial-domain concept; the two constants happen
 * to agree, and GP-8 work will remove the duplicate.
 */

export const CONTRACT_COMPAT_STATUSES = [
  'COMPATIBLE',
  'BREAKING_CHANGE',
  'UNKNOWN',
] as const;

export type ContractCompatStatus =
  (typeof CONTRACT_COMPAT_STATUSES)[number];

export interface ContractCompatFinding {
  /** Rule identifier from the compatibility policy. */
  rule: string;
  /** Whether this finding alone would make the change a breaking change. */
  breaking: boolean;
  /** Human-readable description of what changed. */
  message: string;
}

export interface ContractCompatReport {
  /** The overall compatibility verdict. */
  status: ContractCompatStatus;
  /** Individual findings, in the order the rules were applied. */
  findings: ContractCompatFinding[];
}

/**
 * The subset of JSON Schema that the compatibility evaluator understands.
 *
 * `version` is the contract's own semver label (stored in `DataContract.version`,
 * not the JSON Schema `$schema` version). `required` and `properties` are
 * standard JSON Schema fields.
 */
export interface JsonSchemaLike {
  version?: string;
  required?: string[];
  properties?: Record<string, { type?: string | string[] }>;
}

// ── Semver helpers ────────────────────────────────────────────────────────────

export function parseSemver(
  version: string,
): { major: number; minor: number; patch: number } | undefined {
  const match = /^(\d+)\.(\d+)(\.(\d+))?$/.exec(version.trim());
  if (!match) {
    return undefined;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: match[4] !== undefined ? Number(match[4]) : 0,
  };
}

function typeOf(prop?: { type?: string | string[] }): string {
  if (!prop?.type) return 'unknown';
  return Array.isArray(prop.type) ? prop.type.join(',') : prop.type;
}

// ── Core schema comparison ────────────────────────────────────────────────────

/**
 * Compares two versions of a JSON Schema contract and returns the compatibility
 * findings. The rules follow config/data-product-compatibility-policy.yaml.
 *
 * This is a pure function — it does not load the policy from disk so it works
 * in both browser (data-products frontend) and Node (composer-backend) without
 * a file-system dependency.
 */
export function compareJsonSchemas(
  previous: JsonSchemaLike,
  next: JsonSchemaLike,
): ContractCompatFinding[] {
  const findings: ContractCompatFinding[] = [];

  // ── Version change ──────────────────────────────────────────────────────
  const prevSemver = previous.version ? parseSemver(previous.version) : undefined;
  const nextSemver = next.version ? parseSemver(next.version) : undefined;

  if (prevSemver && nextSemver) {
    if (nextSemver.major !== prevSemver.major) {
      findings.push({
        rule: 'major_version_change',
        breaking: false, // potentially, but not definitively — consumers decide
        message: `Major version change ${previous.version} → ${next.version} is potentially breaking`,
      });
    } else if (nextSemver.minor !== prevSemver.minor || nextSemver.patch !== prevSemver.patch) {
      findings.push({
        rule: 'minor_or_patch_version_change',
        breaking: false,
        message: `Patch/minor change ${previous.version} → ${next.version} stays inside the same major version`,
      });
    }
  }

  // ── Required fields ─────────────────────────────────────────────────────
  const prevRequired = new Set(previous.required ?? []);
  const nextRequired = new Set(next.required ?? []);
  const prevProps = previous.properties ?? {};
  const nextProps = next.properties ?? {};

  for (const field of prevRequired) {
    if (!nextRequired.has(field) || !(field in nextProps)) {
      findings.push({
        rule: 'removed_required_field',
        breaking: true,
        message: `Required field "${field}" was removed`,
      });
    }
  }

  // ── Field type changes ───────────────────────────────────────────────────
  for (const field of Object.keys(prevProps)) {
    if (field in nextProps) {
      const prevType = typeOf(prevProps[field]);
      const nextType = typeOf(nextProps[field]);
      if (prevType !== nextType) {
        findings.push({
          rule: 'changed_field_type',
          breaking: true,
          message: `Field "${field}" type changed from ${prevType} to ${nextType}`,
        });
      }
    }
  }

  // ── New fields ───────────────────────────────────────────────────────────
  for (const field of Object.keys(nextProps)) {
    if (field in prevProps) continue;
    if (nextRequired.has(field)) {
      findings.push({
        rule: 'new_required_field',
        breaking: true,
        message: `New required field "${field}" was added`,
      });
    } else {
      findings.push({
        rule: 'new_optional_field',
        breaking: false,
        message: `New optional field "${field}" was added`,
      });
    }
  }

  return findings;
}

/**
 * Full compatibility evaluation for a contract update.
 *
 * Returns `COMPATIBLE` when no findings are breaking, `BREAKING_CHANGE` when
 * any finding is, and `UNKNOWN` when the schemas have no version or property
 * information to compare (e.g. both are empty objects).
 */
export function evaluateContractCompatibility(
  previous: JsonSchemaLike,
  next: JsonSchemaLike,
): ContractCompatReport {
  const findings = compareJsonSchemas(previous, next);
  const hasBreaking = findings.some(f => f.breaking);

  const hasSchema =
    (previous.properties && Object.keys(previous.properties).length > 0) ||
    (next.properties && Object.keys(next.properties).length > 0) ||
    (previous.required && previous.required.length > 0) ||
    (next.required && next.required.length > 0) ||
    Boolean(previous.version) ||
    Boolean(next.version);

  let status: ContractCompatStatus;
  if (!hasSchema) {
    status = 'UNKNOWN';
  } else if (hasBreaking) {
    status = 'BREAKING_CHANGE';
  } else {
    status = 'COMPATIBLE';
  }

  return { status, findings };
}

// ── Schema Drift Detection (A-2) ──────────────────────────────────────────────

/**
 * A recorded schema state snapshot, captured at a point in time.
 * Used by drift detection to compare current schema against a historical baseline.
 */
export interface SchemaSnapshot {
  contractId: string;
  capturedAt: string;          // ISO timestamp
  schema: JsonSchemaLike;
  version: string;
}

export interface SchemaDriftResult {
  contractId: string;
  baselineSnapshot: SchemaSnapshot;
  currentSchema: JsonSchemaLike;
  currentVersion: string;
  hasDrift: boolean;
  findings: ContractCompatFinding[];
  status: ContractCompatStatus;
}

/**
 * Detect drift between a captured schema snapshot and the current schema.
 *
 * Returns UNKNOWN when either schema has no structure to compare.
 * Returns COMPATIBLE when schemas match.
 * Returns BREAKING_CHANGE when structural changes were detected.
 *
 * A-2: Schema Drift Detection.
 */
export function detectSchemaDrift(
  baseline: SchemaSnapshot,
  currentSchema: JsonSchemaLike,
  currentVersion: string,
): SchemaDriftResult {
  const report = evaluateContractCompatibility(baseline.schema, currentSchema);
  return {
    contractId: baseline.contractId,
    baselineSnapshot: baseline,
    currentSchema,
    currentVersion,
    hasDrift: report.status !== 'COMPATIBLE' && report.status !== 'UNKNOWN',
    findings: report.findings,
    status: report.status,
  };
}
