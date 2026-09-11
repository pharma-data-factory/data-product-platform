/**
 * Content hash for requirement versions.
 *
 * An electronic signature is only worth anything if it is bound to what was
 * signed. Every signature stores the hash of the content at the moment of
 * signing; before a later signature is accepted the hash is recomputed and
 * compared, so an edit between two signatures cannot go unnoticed.
 *
 * This is the only place in the codebase that computes the hash. The frontend
 * imports it too, so that what a reviewer sees on screen and what the backend
 * verifies can never drift apart.
 *
 * Changing the field list or the canonical form invalidates every hash already
 * stored, and therefore every signature. Treat it as a schema migration, not
 * as a refactor.
 */

import { createHash } from 'crypto';

/**
 * The content a requirement version is signed for.
 *
 * The specification names these fields title, description, rationale,
 * gxpCritical, riskClass, category and acceptanceCriteria. Two differ here:
 *
 * - `gxpRelevance` replaces the specification's boolean `gxpCritical`. This
 *   codebase distinguishes NONE, INDIRECT and DIRECT, and collapsing that to a
 *   boolean would let a reclassification from INDIRECT to DIRECT — a change
 *   that alters the required approval path — leave the hash untouched.
 * - `riskClass` is stored as `criticality` on the requirement version.
 */
export interface RequirementContent {
  title: string;
  description: string;
  rationale?: string | null;
  category?: string | null;
  acceptanceCriteria?: string | null;
  gxpRelevance?: string | null;
  riskClass?: string | null;
}

/**
 * The fields that make up the hash, in canonical order.
 *
 * Listed explicitly rather than derived from the object, so that adding a
 * field to RequirementContent cannot silently change every hash.
 */
export const HASHED_CONTENT_FIELDS: readonly (keyof RequirementContent)[] = [
  'acceptanceCriteria',
  'category',
  'description',
  'gxpRelevance',
  'rationale',
  'riskClass',
  'title',
];

export const CONTENT_HASH_ALGORITHM = 'sha256';

/**
 * Absent, null and empty are the same thing.
 *
 * A text column round-trips an empty string as NULL in some drivers and as ''
 * in others. Without this, storing and reloading an unchanged requirement
 * could produce a different hash and invalidate a valid signature.
 */
function normalize(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return value;
}

/**
 * The exact string that gets hashed.
 *
 * Exported for diagnostics: when a hash comparison fails, the two canonical
 * forms show which field actually differs.
 */
export function canonicalizeContent(content: RequirementContent): string {
  const canonical: Record<string, string | null> = {};
  for (const field of HASHED_CONTENT_FIELDS) {
    canonical[field] = normalize(content[field]);
  }
  return JSON.stringify(canonical);
}

/** SHA-256 of the canonical form, lower-case hex. */
export function computeContentHash(content: RequirementContent): string {
  return createHash(CONTENT_HASH_ALGORITHM)
    .update(canonicalizeContent(content), 'utf8')
    .digest('hex');
}
