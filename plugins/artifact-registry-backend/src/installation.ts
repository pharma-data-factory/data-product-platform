/**
 * What this installation is.
 *
 * There was no answer. An instance had no id, no name and no notion of which
 * edition it ran — which is tolerable while exactly one instance exists and
 * becomes a defect the moment two do. Two Nexora installations collide on the
 * platform product `nexora-core`, on `organizationId: internal`, on the catalog
 * namespace `default`, and on artifact coordinates, where a local fork silently
 * shadows an upstream version with no signal to anyone.
 *
 * This is the first half of fixing that: an installation can state who it is
 * and what it runs. The second half — using the statement to attribute
 * federated content to its origin — is T4 of the topology track
 * (`PHASE_CLOSURE_PLAN.md` §9.6).
 *
 * The edition catalogue is loaded here rather than in Core because the registry
 * is what filters by it. `catalog/editions.yaml` has existed since W3-8 and was
 * read by nothing; its own header claimed "Core reads this file at startup",
 * which was never true. It is true now, of this plugin.
 */

import { readFile } from 'fs/promises';
import { parse as parseYaml } from 'yaml';
import {
  resolveEditions,
  validateEditionCatalogue,
  type EditionCatalogue,
  type ResolvedEdition,
} from '@internal/platform-common';

/** Who this installation is, and what it runs. */
export interface InstallationIdentity {
  /**
   * Stable id for this installation. Federation uses it to attribute content
   * to an origin, so it must be unique across installations that talk to each
   * other — not merely within one deployment.
   */
  id: string;
  displayName: string;
  /**
   * The edition this installation runs, resolved through `extends`.
   *
   * Absent means no edition was configured, which is a legitimate state and
   * not an error: an operator who has not chosen an edition has not asked to
   * be restricted, and everything stays visible.
   */
  edition?: ResolvedEdition;
  /** Every edition the catalogue declares, for display and diagnosis. */
  availableEditions: ResolvedEdition[];
}

export const DEFAULT_INSTALLATION_ID = 'nexora-local';

/**
 * Reads and resolves `catalog/editions.yaml`.
 *
 * **A malformed catalogue throws.** Degrading to "no editions" would silently
 * ship everything everywhere, which is the precise failure an edition exists to
 * prevent — an operator who wrote a broken catalogue would get a working
 * installation with none of the scoping they asked for, and no sign of it. A
 * *missing* file is different and is not an error: an installation that does
 * not use editions is a legitimate installation.
 */
export async function loadEditionCatalogue(
  path: string,
): Promise<EditionCatalogue | undefined> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }

  const document = parseYaml(raw);
  const issues = validateEditionCatalogue(document);
  if (issues.length > 0) {
    throw new Error(
      `Edition catalogue ${path} is invalid: ${issues.join('; ')}`,
    );
  }
  return document as EditionCatalogue;
}

export interface ResolveInstallationOptions {
  id?: string;
  displayName?: string;
  editionId?: string;
  catalogue?: EditionCatalogue;
}

/**
 * Builds the installation's identity from configuration and the catalogue.
 *
 * A configured edition that the catalogue does not declare throws. It is
 * almost always a typo, and the alternative — falling back to no edition —
 * would hand the operator an unrestricted installation while they believed
 * they had a scoped one.
 */
export function resolveInstallation(
  options: ResolveInstallationOptions,
): InstallationIdentity {
  const id = options.id?.trim() || DEFAULT_INSTALLATION_ID;
  const resolved = options.catalogue
    ? resolveEditions(options.catalogue)
    : new Map<string, ResolvedEdition>();

  let edition: ResolvedEdition | undefined;
  const wanted = options.editionId?.trim();
  if (wanted) {
    edition = resolved.get(wanted);
    if (!edition) {
      const known = [...resolved.keys()].join(', ') || 'none';
      throw new Error(
        `Configured edition "${wanted}" is not declared in the edition ` +
          `catalogue. Declared editions: ${known}.`,
      );
    }
  }

  return {
    id,
    displayName: options.displayName?.trim() || id,
    edition,
    availableEditions: [...resolved.values()],
  };
}
