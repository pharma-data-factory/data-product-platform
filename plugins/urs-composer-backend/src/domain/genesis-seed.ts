/**
 * Genesis version 0.1 for a brand-new requirement.
 *
 * Shared by createRequirement (service) and requirement-set seeds so a seeded
 * URS (e.g. URS-WD) can be baselined without a separate "create version" step.
 */

import { randomUUID } from 'crypto';
import {
  RequirementPriority,
  RequirementVersion,
  URSRequirement,
  URSStatus,
} from '../types';
import { firstVersion, versionOrdinal } from './versioning';
import { hashOf } from './signature-service';

/** Fields needed to open version 0.1 — matches URSRequirement content. */
export type GenesisRequirementSource = Pick<
  URSRequirement,
  | 'requirementId'
  | 'title'
  | 'statement'
  | 'rationale'
  | 'category'
  | 'priority'
  | 'acceptanceIntent'
  | 'classification'
  | 'gxpRelevance'
  | 'source'
  | 'owner'
>;

/**
 * Build an immutable DRAFT 0.1 snapshot for a requirement that has no versions.
 *
 * `id` defaults to a random UUID; seeds may pass a stable id for reproducibility.
 */
export function buildGenesisRequirementVersion(
  requirement: GenesisRequirementSource,
  actor: string,
  options?: { id?: string; createdAt?: Date },
): RequirementVersion {
  const first = firstVersion();
  const now = options?.createdAt ?? new Date();
  const version: RequirementVersion = {
    id: options?.id ?? randomUUID(),
    requirementId: requirement.requirementId,
    version: first.label,
    versionLabel: first.label,
    major: first.major,
    minor: first.minor,
    versionNumber: versionOrdinal(first),
    title: requirement.title,
    statement: requirement.statement,
    rationale: requirement.rationale,
    category: requirement.category,
    priority: requirement.priority ?? RequirementPriority.MUST,
    acceptanceIntent: requirement.acceptanceIntent,
    classification: requirement.classification,
    gxpRelevance: requirement.gxpRelevance,
    source: requirement.source,
    owner: requirement.owner,
    status: URSStatus.DRAFT,
    createdBy: actor,
    createdAt: now,
    revision: 1,
  };
  version.contentHash = hashOf(version);
  return version;
}
