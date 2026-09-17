/**
 * Parity between the legacy Marketplace data and the Artifact registry model.
 *
 * The Marketplace still reads `marketplaceItems`, a hand-written array. Before
 * it can read the registry instead, every offering in that array has to make
 * the trip through a manifest and come back unchanged. This suite is the
 * proof, and it is what stops the array being deleted on the strength of an
 * assertion that it maps "cleanly".
 *
 * It fails loudly on a new offering the registry cannot represent — a category
 * with no kind, an id that is not a coordinate segment, a version outside the
 * shared grammar — which is the point. That failure is the signal to extend
 * the model, not to special-case the offering.
 */

import {
  MARKETPLACE_CATEGORY_KINDS,
  marketplaceOfferingToManifest,
  marketplaceOfferingView,
  marketplaceViewOfManifest,
  validateMarketplaceOffering,
} from '@internal/platform-common';
import { validateArtifactManifest } from '@internal/platform-common';
import {
  MARKETPLACE_CATEGORIES,
  marketplaceItems,
  type MarketplaceItem,
} from './data';

const cases: [string, MarketplaceItem][] = marketplaceItems.map(item => [
  item.id,
  item,
]);

describe('legacy marketplace offerings map onto the registry model', () => {
  it('has offerings to check', () => {
    expect(marketplaceItems.length).toBeGreaterThan(0);
  });

  it('ships the twelve offerings the manifest directory holds', () => {
    // A tripwire, not a proof. This plugin is frontend and may not read the
    // filesystem, so it cannot compare itself to `catalog/artifacts/nexora/`.
    // Changing this array without adding the matching manifest fails here and
    // in `packages/platform-common/src/artifactManifestFiles.test.ts`, which
    // owns the other half. Both lists go away when the array does.
    expect(marketplaceItems.map(item => item.id).sort()).toEqual([
      'aas-data-product',
      'aas-foundation',
      'machine-state-consumer-data-product',
      'mqtt-data-connector',
      'mqtt-temperature-data-product',
      'nodejs-microservice',
      'oee-data-product',
      'python-microservice',
      'rest-api-connector',
      'rest-equipment-data-product',
      'snowflake-connector',
      'unified-namespace',
    ]);
  });

  it.each(cases)('%s is a mappable offering', (_id, item) => {
    expect(validateMarketplaceOffering(item)).toEqual([]);
  });

  it.each(cases)('%s produces a manifest the registry accepts', (_id, item) => {
    const manifest = marketplaceOfferingToManifest(item);
    expect(manifest).toBeDefined();
    expect(validateArtifactManifest(manifest)).toEqual([]);
  });

  it.each(cases)('%s survives the round trip unchanged', (_id, item) => {
    const manifest = marketplaceOfferingToManifest(item)!;
    expect(marketplaceViewOfManifest(manifest)).toEqual(
      marketplaceOfferingView(item),
    );
  });

  it.each(cases)('%s keeps its id as the artifact name', (_id, item) => {
    const manifest = marketplaceOfferingToManifest(item)!;
    expect(manifest.metadata.name).toBe(item.id);
  });

  it('files every offering under the kind its category maps to', () => {
    const byKind = marketplaceItems.map(item => [
      item.id,
      marketplaceOfferingToManifest(item)!.kind,
    ]);
    expect(byKind).toEqual(
      marketplaceItems.map(item => [
        item.id,
        MARKETPLACE_CATEGORY_KINDS[item.category],
      ]),
    );
  });

  it('gives every offering a namespace an owning publisher can claim', () => {
    const namespaces = new Set(
      marketplaceItems.map(
        item => marketplaceOfferingToManifest(item)!.metadata.namespace,
      ),
    );
    // One provider today. The assertion is that the set is derived and
    // non-empty, not that it stays at one.
    expect(namespaces.size).toBeGreaterThan(0);
    expect([...namespaces]).toEqual(['nexora']);
  });

  it('produces a distinct coordinate for every offering', () => {
    const refs = marketplaceItems.map(item => {
      const { metadata } = marketplaceOfferingToManifest(item)!;
      return `${metadata.namespace}/${metadata.name}@${metadata.version}`;
    });
    expect(new Set(refs).size).toBe(marketplaceItems.length);
  });

  it('claims no registry certification on any offering', () => {
    // Registration always yields DRAFT with no certification status. An
    // offering that today displays CERTIFIED carries that only as Marketplace
    // metadata; earning it in the registry means going through review and
    // certification. Reconciling the two is the read-switch slice, and this
    // guards against quietly shortcutting it in the manifest.
    for (const item of marketplaceItems) {
      const manifest = marketplaceOfferingToManifest(item)!;
      expect(manifest.spec).not.toHaveProperty('certificationStatus');
      expect(manifest.spec).not.toHaveProperty('lifecycle');
    }
  });
});

describe('the category taxonomy the offerings use', () => {
  it('maps every category an offering actually declares', () => {
    const used = [...new Set(marketplaceItems.map(item => item.category))];
    const unmapped = used.filter(
      category => !MARKETPLACE_CATEGORY_KINDS[category],
    );
    expect(unmapped).toEqual([]);
  });

  it('records the categories that have no registry kind yet', () => {
    // "Solutions" is a Marketplace shelf with no Artifact kind behind it, and
    // no offering uses it. Naming the gap here keeps it a known, deliberate
    // hole rather than something discovered when the first Solution appears —
    // at which point the mappable-offering tests above go red.
    const unmapped = MARKETPLACE_CATEGORIES.filter(
      category => !MARKETPLACE_CATEGORY_KINDS[category],
    );
    expect(unmapped).toEqual(['Solutions']);
  });
});
