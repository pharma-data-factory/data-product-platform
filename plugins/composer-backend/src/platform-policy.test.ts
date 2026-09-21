/**
 * The platform policy and the code that enforces it.
 *
 * The case that matters most: an obligation naming a check that does not exist
 * must FAIL, not quietly pass. A typo in the policy file should be loud —
 * otherwise it silently disables a rule while the document still reads as
 * though the rule applies.
 */

import type { Product } from '@internal/platform-common';

import {
  evaluatePlatformPolicy,
  isPolicyVersionSupported,
  PLATFORM_POLICY,
  type PlatformPolicy,
} from './platform-policy';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'demo',
    productType: 'DATA_PRODUCT',
    lifecycle: 'experimental',
    status: 'ACTIVE',
    owner: 'group:default/platform-team',
    dataClassification: 'INTERNAL',
    gxpRelevance: 'NONE',
    createdBy: 'user:default/tester',
    createdAt: new Date(),
    revision: 1,
    ...overrides,
  } as Product;
}

// Parity between config/data-product-platform-policy.yaml and the vendored
// JSON is asserted in packages/backend/src/platformPolicyParity.test.ts,
// alongside the same check for the compatibility policy.
describe('platform policy document', () => {
  it('declares its own version as supported', () => {
    // Dropping the current version would block every freshly built product.
    expect(PLATFORM_POLICY.supportedVersions).toContain(PLATFORM_POLICY.version);
  });

  it('gives every obligation a check that exists', () => {
    // The guard against a policy that reads stricter than it is. Each
    // obligation is exercised against a product that satisfies everything; any
    // finding at this point means the check name did not resolve.
    const compliant = product({
      criticality: 'HIGH',
      gxpRelevance: 'DIRECT',
    });

    expect(evaluatePlatformPolicy(compliant)).toEqual([]);
  });
});

describe('evaluatePlatformPolicy', () => {
  it('passes a product that meets every obligation', () => {
    expect(evaluatePlatformPolicy(product())).toEqual([]);
  });

  it('reports a missing owner', () => {
    const findings = evaluatePlatformPolicy(product({ owner: undefined }));

    expect(findings.map(f => f.obligationId)).toEqual(['owner-declared']);
  });

  it('reports every unmet obligation at once, not just the first', () => {
    // Fixing release blockers one at a time is a bad round trip.
    const findings = evaluatePlatformPolicy(
      product({
        owner: undefined,
        dataClassification: undefined,
        gxpRelevance: undefined,
      }),
    );

    expect(findings.map(f => f.obligationId)).toEqual([
      'owner-declared',
      'data-classification-declared',
      'gxp-relevance-declared',
    ]);
  });

  it('applies GxP-only obligations to GxP products', () => {
    const findings = evaluatePlatformPolicy(
      product({ gxpRelevance: 'DIRECT', criticality: undefined }),
    );

    expect(findings.map(f => f.obligationId)).toContain(
      'gxp-criticality-declared',
    );
  });

  it('spares a non-GxP product the GxP-only obligations', () => {
    const findings = evaluatePlatformPolicy(
      product({ gxpRelevance: 'NONE', criticality: undefined }),
    );

    expect(findings).toEqual([]);
  });

  it('treats an unknown check as unmet rather than satisfied', () => {
    // A typo in the policy file must not disable the obligation silently.
    const broken: PlatformPolicy = {
      version: 1,
      supportedVersions: [1],
      obligations: [
        {
          id: 'typo',
          title: 'Obligation with a misspelled check',
          appliesTo: 'all',
          check: 'ownr-set',
          message: 'unused',
        },
      ],
    };

    const findings = evaluatePlatformPolicy(product(), broken);

    expect(findings).toHaveLength(1);
    expect(findings[0].message).toMatch(/unknown check/i);
  });
});

describe('isPolicyVersionSupported', () => {
  it('accepts the current version', () => {
    expect(isPolicyVersionSupported(PLATFORM_POLICY.version)).toBe(true);
  });

  it('rejects a version that has been withdrawn', () => {
    expect(isPolicyVersionSupported(99)).toBe(false);
  });

  it('holds a product from before the policy to the current one', () => {
    // No pin means the product predates policy pinning. Exempting it would
    // make "built before we cared" a permanent loophole.
    expect(isPolicyVersionSupported(undefined)).toBe(true);
  });
});
