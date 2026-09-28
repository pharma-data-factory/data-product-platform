/**
 * Platform Editions, resolved.
 *
 * An Edition is a named combination of Core plus artifacts plus capabilities.
 * `catalog/editions.yaml` has declared four of them since W3-8 and **nothing
 * read the file** — no loader, no startup hook, no consumer. The file's own
 * header claimed "Core reads this file at startup", which was never true, and
 * `editionHasCapability` promised to check "a given edition (or any parent)"
 * while doing a flat `includes` on one edition's own list. Two claims, both
 * false, both making dormant code read as live.
 *
 * This module is the resolution half: parse, validate, and flatten the
 * `extends` chain. Loading the file and deciding what an installation *is* are
 * the backend's job; what belongs here is the part that must be the same
 * answer everywhere.
 *
 * **Why resolution is not optional.** `nexora-enterprise` extends
 * `nexora-life-sciences` extends `nexora-core`. Asking whether the enterprise
 * edition has `artifact-marketplace` — declared on core — must answer yes, or
 * an inherited capability silently disappears and an installation reports
 * itself less capable than it is. A flat lookup gets that wrong for three of
 * the four editions that ship.
 */

/** One edition as declared in `catalog/editions.yaml`. */
export interface PlatformEdition {
  id: string;
  displayName: string;
  description?: string;
  /** Edition this one extends, inheriting its capabilities and artifacts. */
  extends?: string;
  capabilities: string[];
  /** Artifact coordinates featured in the Marketplace for this edition. */
  featuredArtifacts: string[];
  /** Policy pack coordinate an installation on this edition pre-loads. */
  gxpPolicy?: string;
}

export interface EditionCatalogue {
  editions: PlatformEdition[];
}

/**
 * An edition with its inheritance applied.
 *
 * Separate type on purpose. A `PlatformEdition` is what an author wrote; a
 * `ResolvedEdition` is what an installation runs, and confusing the two is how
 * the flat-lookup bug happened. Anything deciding behaviour takes the resolved
 * form.
 */
export interface ResolvedEdition {
  id: string;
  displayName: string;
  description?: string;
  /** This edition then its ancestors, nearest first. Always starts with `id`. */
  lineage: string[];
  /** Own capabilities plus every ancestor's, de-duplicated. */
  capabilities: string[];
  featuredArtifacts: string[];
  /** Nearest declaration in the lineage wins. */
  gxpPolicy?: string;
}

const EDITION_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

/**
 * Checks a parsed `editions.yaml` document.
 *
 * Returns every problem rather than the first. A malformed catalogue must fail
 * loudly and completely — degrading to "no editions" would silently ship
 * everything everywhere, which is the failure an edition exists to prevent.
 */
export function validateEditionCatalogue(input: unknown): string[] {
  const issues: string[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return ['Edition catalogue must be a mapping'];
  }
  const raw = (input as { editions?: unknown }).editions;
  if (!Array.isArray(raw)) {
    return ['editions must be a list'];
  }

  const seen = new Set<string>();
  const ids = new Set<string>();
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) {
      issues.push('Each edition must be a mapping');
      continue;
    }
    const e = entry as Record<string, unknown>;
    const id = typeof e.id === 'string' ? e.id : undefined;
    if (!id || !EDITION_ID.test(id)) {
      issues.push(
        `Edition id ${JSON.stringify(e.id)} must be lowercase kebab-case`,
      );
      continue;
    }
    if (seen.has(id)) {
      issues.push(`Edition "${id}" is declared more than once`);
    }
    seen.add(id);
    ids.add(id);
    if (typeof e.displayName !== 'string' || !e.displayName.trim()) {
      issues.push(`Edition "${id}" must have a displayName`);
    }
    if (e.capabilities !== undefined && !isStringArray(e.capabilities)) {
      issues.push(`Edition "${id}" capabilities must be a list of strings`);
    }
    if (e.featuredArtifacts !== undefined && !isStringArray(e.featuredArtifacts)) {
      issues.push(`Edition "${id}" featuredArtifacts must be a list of strings`);
    }
    if (e.extends !== undefined && typeof e.extends !== 'string') {
      issues.push(`Edition "${id}" extends must be an edition id`);
    }
  }

  // Dangling and circular inheritance, checked once every id is known.
  for (const entry of raw) {
    const e = entry as Record<string, unknown>;
    const id = typeof e.id === 'string' ? e.id : undefined;
    const parent = typeof e.extends === 'string' ? e.extends : undefined;
    if (!id || !parent) continue;
    if (!ids.has(parent)) {
      issues.push(`Edition "${id}" extends "${parent}", which is not declared`);
    }
    if (parent === id) {
      issues.push(`Edition "${id}" extends itself`);
    }
  }
  issues.push(...cycleIssues(raw as Record<string, unknown>[]));

  return issues;
}

/** Inheritance cycles, reported once per cycle rather than once per member. */
function cycleIssues(entries: Record<string, unknown>[]): string[] {
  const parents = new Map<string, string>();
  for (const e of entries) {
    if (typeof e.id === 'string' && typeof e.extends === 'string') {
      parents.set(e.id, e.extends);
    }
  }
  const issues: string[] = [];
  const reported = new Set<string>();
  for (const start of parents.keys()) {
    const path: string[] = [];
    let current: string | undefined = start;
    while (current && !path.includes(current)) {
      path.push(current);
      current = parents.get(current);
    }
    if (current && !reported.has(current)) {
      const cycle = path.slice(path.indexOf(current)).concat(current);
      cycle.forEach(id => reported.add(id));
      issues.push(`Edition inheritance is circular: ${cycle.join(' -> ')}`);
    }
  }
  return issues;
}

/**
 * Flattens every edition's `extends` chain.
 *
 * Throws on an invalid catalogue rather than returning a partial one. A caller
 * holding half a catalogue cannot tell an edition that grants nothing from one
 * that failed to load, and that distinction is the whole point.
 */
export function resolveEditions(
  catalogue: EditionCatalogue,
): Map<string, ResolvedEdition> {
  const issues = validateEditionCatalogue(catalogue);
  if (issues.length > 0) {
    throw new Error(`Invalid edition catalogue: ${issues.join('; ')}`);
  }

  const byId = new Map(catalogue.editions.map(e => [e.id, e]));
  const resolved = new Map<string, ResolvedEdition>();

  for (const edition of catalogue.editions) {
    const lineage: string[] = [];
    const capabilities: string[] = [];
    const featured: string[] = [];
    let gxpPolicy: string | undefined;

    let current: PlatformEdition | undefined = edition;
    while (current) {
      lineage.push(current.id);
      capabilities.push(...(current.capabilities ?? []));
      featured.push(...(current.featuredArtifacts ?? []));
      // Nearest declaration wins: the first one seen walking outwards.
      if (gxpPolicy === undefined) gxpPolicy = current.gxpPolicy;
      current = current.extends ? byId.get(current.extends) : undefined;
    }

    resolved.set(edition.id, {
      id: edition.id,
      displayName: edition.displayName,
      description: edition.description,
      lineage,
      capabilities: [...new Set(capabilities)],
      featuredArtifacts: [...new Set(featured)],
      gxpPolicy,
    });
  }

  return resolved;
}

/**
 * Whether a capability is enabled in a resolved edition.
 *
 * Takes the resolved form so inheritance cannot be forgotten. The previous
 * signature took a `PlatformEdition` and did a flat `includes`, while its own
 * comment claimed it checked parents — so `nexora-enterprise` reported that it
 * lacked `artifact-marketplace`, which it inherits from core.
 */
export function editionHasCapability(
  edition: ResolvedEdition,
  capability: string,
): boolean {
  return edition.capabilities.includes(capability);
}

/**
 * Whether an artifact declaring `editions` is available to this installation.
 *
 * Permissive by design, in one direction only: an artifact that declares no
 * editions is available everywhere. Requiring every manifest to opt in would
 * empty the marketplace of everything written before editions existed, and an
 * artifact with no stated audience is not a secret.
 *
 * An installation on no configured edition sees everything. That is the honest
 * reading of "not configured" — and it is a decision, not a gap: an operator
 * who has not chosen an edition has not asked to be restricted.
 *
 * Inheritance counts. An artifact scoped to `nexora-core` is available to
 * `nexora-life-sciences`, which extends it — the narrower edition is a superset
 * of the broader one, not a sibling.
 */
export function artifactAvailableInEdition(
  declaredEditions: readonly string[] | undefined,
  installationEdition: ResolvedEdition | undefined,
): boolean {
  if (!declaredEditions || declaredEditions.length === 0) return true;
  if (!installationEdition) return true;
  return declaredEditions.some(id => installationEdition.lineage.includes(id));
}
