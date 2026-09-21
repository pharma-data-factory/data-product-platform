/**
 * Policy Pack Resolver — W3-6.
 *
 * When an Artifact manifest declares `spec.policies[]`, the registry resolves
 * each referenced POLICY_PACK artifact and returns its obligations. This
 * powers the release gate: a product cannot be released until all policy
 * obligations are satisfied.
 *
 * A POLICY_PACK artifact's manifest carries `spec.obligations` — a list of
 * obligation rules that the consuming product must fulfil. The resolver
 * collects all obligations from all declared policies and returns them as a
 * flat list.
 *
 * Design: the resolver is stateless and side-effect-free. It reads from the
 * registry via the service layer and returns a typed result. The release gate
 * (ComposerService) decides what to do with the findings.
 */

import type { ArtifactRegistryService } from './service';
import { parseArtifactRef, type ArtifactManifest } from '@internal/platform-common';

export interface PolicyObligation {
  /** The policy that declares this obligation. */
  policyRef: string;
  /** Unique obligation identifier within the policy. */
  id: string;
  /** Human-readable title. */
  title: string;
  /** Check identifier the platform can evaluate. */
  check: string;
  /** Which products this applies to: 'all' | 'gxp' | 'commercial'. */
  appliesTo: string;
  /** User-facing message when the obligation is not met. */
  message: string;
}

export interface PolicyResolutionResult {
  /** Policy references that were successfully resolved. */
  resolved: string[];
  /** Policy references that could not be found in the registry. */
  unresolved: string[];
  /** All obligations from all resolved policies. */
  obligations: PolicyObligation[];
}

/**
 * Resolve a list of policy references against the artifact registry.
 *
 * Each entry in `policyRefs` must be a coordinate `namespace/name@version`.
 * The POLICY_PACK artifact's manifest is expected to carry
 * `spec.policyDocument.obligations[]` with the obligation list.
 */
export async function resolvePolicies(
  policyRefs: readonly string[],
  service: ArtifactRegistryService,
): Promise<PolicyResolutionResult> {
  const resolved: string[] = [];
  const unresolved: string[] = [];
  const obligations: PolicyObligation[] = [];

  for (const ref of policyRefs) {
    const coord = parseArtifactRef(ref);
    if (!coord) {
      unresolved.push(ref);
      continue;
    }

    try {
      const version = await service.resolve(coord);
      if (!version?.manifest) {
        unresolved.push(ref);
        continue;
      }

      // Use the typed ArtifactManifest instead of a raw cast
      const manifest = version.manifest as ArtifactManifest;

      if (manifest.kind !== 'POLICY_PACK') {
        unresolved.push(`${ref} (not a POLICY_PACK artifact)`);
        continue;
      }

      resolved.push(ref);

      const policyObligations = manifest.spec?.policyDocument?.obligations ?? [];
      for (const obl of policyObligations) {
        obligations.push({
          policyRef: ref,
          id: obl.id ?? '',
          title: obl.title ?? obl.id ?? '',
          check: obl.check ?? '',
          appliesTo: obl.appliesTo ?? 'all',
          message: obl.message ?? '',
        });
      }
    } catch {
      unresolved.push(ref);
    }
  }

  return { resolved, unresolved, obligations };
}
