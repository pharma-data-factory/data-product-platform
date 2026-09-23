/**
 * Evaluation of the platform policy against a product.
 *
 * The URS says what a product must do; the policy says under which conditions
 * it may be released at all. Both are checked by the release gate, and both
 * are refusals rather than warnings — a warning at release time is a warning
 * nobody reads.
 *
 * The obligations live in config/data-product-platform-policy.yaml and are
 * vendored here as JSON, the same arrangement the compatibility policy uses
 * (config/data-product-compatibility-policy.yaml ->
 * packages/data-product-sdk/dataprod/compatibility-policy.json). A parity test
 * keeps the two identical.
 *
 * Every obligation names a `check` implemented below. An obligation whose check
 * is unknown fails loudly rather than passing silently: a policy that quietly
 * skips what it does not understand is not a policy.
 */

import type { Product } from '@internal/platform-common';

// `platform-policy.document.json`, not `platform-policy.json`. The basename
// has to differ from this module's: while they matched, `import ... from
// './platform-policy'` in service.ts resolved to the JSON in the running
// backend — which exports no functions — and every release-gate call answered
// 500 with "evaluatePlatformPolicy is not a function". Jest resolves `.ts`
// before `.json`, so the whole suite passed while the gate had never once
// worked in the application. Found by executing the path (closure Slice 3).
import policyDocument from './platform-policy.document.json';

export interface PolicyObligation {
  id: string;
  title: string;
  /** 'all' or 'gxp' — the latter applies only to GxP-relevant products. */
  appliesTo: string;
  check: string;
  message: string;
}

export interface PlatformPolicy {
  version: number;
  supportedVersions: number[];
  obligations: PolicyObligation[];
}

export const PLATFORM_POLICY = policyDocument as PlatformPolicy;

/** A product is GxP relevant unless it says otherwise. */
function isGxpRelevant(product: Product): boolean {
  const value = String(product.gxpRelevance ?? '').toUpperCase();
  return value === 'DIRECT' || value === 'INDIRECT';
}

function isSet(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
}

const CHECKS: Record<string, (product: Product) => boolean> = {
  'product-owner-set': p => isSet(p.owner),
  'data-classification-set': p => isSet(p.dataClassification),
  'gxp-relevance-set': p => isSet(p.gxpRelevance),
  'criticality-set': p => isSet(p.criticality),
};

export interface PolicyFinding {
  obligationId: string;
  title: string;
  message: string;
}

/**
 * The obligations this product fails, in policy order.
 *
 * Returns findings rather than throwing: the release gate reports every
 * blocker at once, so that fixing them is one round rather than several.
 */
export function evaluatePlatformPolicy(
  product: Product,
  policy: PlatformPolicy = PLATFORM_POLICY,
): PolicyFinding[] {
  const gxp = isGxpRelevant(product);

  return policy.obligations
    .filter(o => o.appliesTo !== 'gxp' || gxp)
    .filter(o => {
      const check = CHECKS[o.check];
      if (!check) {
        // Unknown check: treat as unmet. The alternative — passing — would let
        // a typo in the policy file silently disable an obligation.
        return true;
      }
      return !check(product);
    })
    .map(o => ({
      obligationId: o.id,
      title: o.title,
      message: CHECKS[o.check]
        ? o.message
        : `Policy obligation ${o.id} names an unknown check "${o.check}".`,
    }));
}

/** Whether a product built against this policy version may still be released. */
export function isPolicyVersionSupported(
  pinnedVersion: number | undefined,
  policy: PlatformPolicy = PLATFORM_POLICY,
): boolean {
  if (pinnedVersion === undefined) {
    // Products created before the policy existed carry no pin. They are held
    // to the current policy rather than exempted from it.
    return true;
  }
  return policy.supportedVersions.includes(pinnedVersion);
}
