/**
 * URS → Product → Git → CI → Validation digital thread contracts.
 *
 * Ownership:
 * - URS Composer: URS SoR (requirements, revisions, baselines, content hashes)
 * - Product Composer: Product / ProductVersion / ProductBaseline / Manifest
 * - Git: immutable exported snapshot (not SoR)
 * - Validation Manager: stable ID references + retest / release decisions only
 *
 * Technical control plane — not a GxP claim by itself.
 */

import { createHash } from 'crypto';
import { computeContentHash } from './content-hash';

/** Statuses that may bind a controlled product to a URS baseline. */
export const URS_BASELINE_BINDABLE_STATUSES = [
  'APPROVED',
  'BASELINED',
] as const;

export type UrsBaselineBindableStatus =
  (typeof URS_BASELINE_BINDABLE_STATUSES)[number];

export function isUrsBaselineBindableStatus(
  value: string,
): value is UrsBaselineBindableStatus {
  return (URS_BASELINE_BINDABLE_STATUSES as readonly string[]).includes(
    String(value ?? '').toUpperCase(),
  );
}

/**
 * Immutable URS pin stored on ProductVersion (intent) and ProductBaseline
 * (controlling snapshot). Must match a live APPROVED/BASELINED URS baseline.
 */
export interface UrsProductBinding {
  requirementSetId: string;
  ursBaselineId: string;
  ursVersion: string;
  ursContentHash: string;
}

export function validateUrsProductBinding(
  binding: Partial<UrsProductBinding> | undefined,
): string[] {
  const issues: string[] = [];
  if (!binding?.requirementSetId?.trim()) {
    issues.push('requirementSetId is required');
  }
  if (!binding?.ursBaselineId?.trim()) {
    issues.push('ursBaselineId is required');
  }
  if (!binding?.ursVersion?.trim()) {
    issues.push('ursVersion is required');
  }
  if (!binding?.ursContentHash?.trim()) {
    issues.push('ursContentHash is required');
  } else if (!/^[a-f0-9]{64}$/i.test(binding.ursContentHash.trim())) {
    issues.push('ursContentHash must be a 64-char hex SHA-256');
  }
  return issues;
}

/**
 * Same canonical form as URS `hashOfBaseline` — shared so Product Composer and
 * Git snapshots never invent a divergent hash algorithm.
 */
export function computeUrsBaselineContentHash(baseline: {
  id: string;
  requirementSetId: string;
  baselineVersion: string;
  requirementVersionIds: string[];
  status: string;
  approvalInstanceId?: string | null;
}): string {
  return computeContentHash({
    title: baseline.id,
    description: baseline.requirementSetId,
    rationale: baseline.baselineVersion,
    acceptanceCriteria: baseline.requirementVersionIds.join(','),
    gxpRelevance: baseline.status,
    category: baseline.approvalInstanceId ?? null,
  });
}

/** Repo paths written by controlled Golden Path scaffold. */
export const DIGITAL_THREAD_REPO_PATHS = {
  productManifest: 'product-manifest.yaml',
  ursBaselineJson: 'docs/urs/URS-baseline.json',
  ursBaselineMd: 'docs/urs/URS-baseline.md',
  traceabilityMatrix: 'docs/urs/traceability-matrix.yaml',
  agents: 'AGENTS.md',
} as const;

/**
 * product-manifest.yaml shape (YAML document). Hash is SHA-256 over canonical
 * JSON of the same logical fields (see computeProductManifestFileHash).
 */
export interface ProductManifestFileDocument {
  productId: string;
  productVersionId: string;
  productBaselineId: string;
  requirementSetId: string;
  ursBaselineId: string;
  ursVersion: string;
  ursContentHash: string;
  manifestContentHash: string;
  components: Array<Record<string, unknown>>;
  contracts: Array<Record<string, unknown>>;
  policies: Array<Record<string, unknown>>;
  qualityGates: Array<Record<string, unknown>>;
}

export function computeProductManifestFileHash(
  doc: Omit<ProductManifestFileDocument, 'manifestContentHash'> & {
    manifestContentHash?: string;
  },
): string {
  const { manifestContentHash: _ignored, ...rest } = doc;
  const canonical = JSON.stringify(sortKeys(rest));
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortKeys(obj[key]);
    }
    return sorted;
  }
  return value;
}

export type RequirementDeltaType =
  | 'ADDED'
  | 'MODIFIED'
  | 'REMOVED'
  | 'UNCHANGED';

export type TraceabilityImpactStatus =
  | 'IMPACTED'
  | 'RETEST_REQUIRED'
  | 'CARRIED_FORWARD'
  | 'CLEARED';

export interface RequirementDeltaItem {
  requirementId: string;
  changeType: RequirementDeltaType;
  previousVersionId?: string;
  currentVersionId?: string;
}

export interface ChangeImpactAssessment {
  id: string;
  productId: string;
  productVersionId: string;
  productBaselineId: string;
  previousUrsBaselineId?: string;
  ursBaselineId: string;
  requirementSetId: string;
  deltas: RequirementDeltaItem[];
  impactedRequirementIds: string[];
  retestRequiredRequirementIds: string[];
  carriedForwardRequirementIds: string[];
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  createdBy: string;
  disclaimer: 'technical-control-not-gxp';
}

/**
 * Validation Manager digital-thread assignment payload. Validation never
 * decides URS/product validity — it stores stable IDs and gates retest/release.
 */
export interface ValidationDigitalThreadRef {
  ursBaselineId: string;
  productId: string;
  productVersionId: string;
  productBaselineId: string;
  manifestHash: string;
  gitRepositoryUrl?: string;
  commitSha?: string;
  releaseCandidateCommitSha?: string;
  requirementSetId?: string;
  ursVersion?: string;
  ursContentHash?: string;
  changeAssessmentId?: string;
}

export interface ValidationRetestItem {
  requirementId: string;
  status: TraceabilityImpactStatus;
  relatedTestIds: string[];
  evidenceIds: string[];
  updatedAt: string;
}

export interface DigitalThreadEvidenceRef {
  ursBaselineId: string;
  productVersionId: string;
  productBaselineId?: string;
  manifestHash: string;
  testRunId?: string;
  evidenceId?: string;
}
