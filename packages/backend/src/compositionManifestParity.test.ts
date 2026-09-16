/**
 * The composition manifests under `catalog/compositions/` are the source of
 * truth for which Platform Components a composition is built from. Core
 * currently keeps a second, hand-maintained copy of the same lists as
 * TypeScript constants in `platform-component-library.ts`, which the Composer,
 * the Marketplace and the Developer Hub read.
 *
 * Nothing kept the two in step. They agree today, and this test is what keeps
 * them agreeing until Phase 3 replaces the constants with resolution from the
 * manifests — at which point the duplication, and this test with it, goes
 * away. Until then a manifest edit that forgets the constant (or the reverse)
 * fails here instead of silently giving the Composer a different answer from
 * the Catalog.
 *
 * See docs/nexora-transformation/HARDCODED_DOMAIN_INVENTORY.md (GP-1).
 */
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import {
  EQUIPMENT_USE_LOG_OPTIONAL_REFS,
  EQUIPMENT_USE_LOG_REQUIRED_REFS,
  MACHINE_METRICS_COMPOSITION_REFS,
  MACHINE_STATE_COMPOSITION_REFS,
  MQTT_TEMPERATURE_CONCEPTUAL_REFS,
  OEE_DIRECT_COMPOSITION_REFS,
  REST_EQUIPMENT_CONCEPTUAL_REFS,
} from '@internal/platform-common';

const ROOT = path.resolve(__dirname, '../../..');

function manifestRefs(relative: string): string[] {
  const manifest = yaml.parse(
    fs.readFileSync(path.join(ROOT, relative), 'utf8'),
  );
  return manifest.spec.components.map((item: { ref: string }) => item.ref);
}

const DUPLICATED_COMPOSITIONS: ReadonlyArray<{
  constant: string;
  refs: readonly string[];
  manifest: string;
}> = [
  {
    constant: 'OEE_DIRECT_COMPOSITION_REFS',
    refs: OEE_DIRECT_COMPOSITION_REFS,
    manifest: 'catalog/compositions/oee-data-product-direct.yaml',
  },
  {
    constant: 'MACHINE_METRICS_COMPOSITION_REFS',
    refs: MACHINE_METRICS_COMPOSITION_REFS,
    manifest: 'catalog/compositions/machine-metrics-reference.yaml',
  },
  {
    constant: 'MACHINE_STATE_COMPOSITION_REFS',
    refs: MACHINE_STATE_COMPOSITION_REFS,
    manifest: 'catalog/compositions/machine-state-consumer.yaml',
  },
  {
    constant: 'MQTT_TEMPERATURE_CONCEPTUAL_REFS',
    refs: MQTT_TEMPERATURE_CONCEPTUAL_REFS,
    manifest: 'catalog/compositions/mqtt-temperature-conceptual.yaml',
  },
  {
    constant: 'REST_EQUIPMENT_CONCEPTUAL_REFS',
    refs: REST_EQUIPMENT_CONCEPTUAL_REFS,
    manifest: 'catalog/compositions/rest-equipment-conceptual.yaml',
  },
];

describe('composition manifest parity', () => {
  it.each(DUPLICATED_COMPOSITIONS)(
    '$constant matches $manifest',
    ({ refs, manifest }) => {
      expect([...refs]).toEqual(manifestRefs(manifest));
    },
  );

  it('keeps the Equipment Use Log required/optional split consistent', () => {
    const required = manifestRefs('catalog/compositions/equipment-use-log.yaml');

    // The manifest carries the required components only; the optional ones are
    // named in Core so the Composer can offer them. The two sets must stay
    // disjoint, or a component would be required and optional at once.
    expect([...EQUIPMENT_USE_LOG_REQUIRED_REFS]).toEqual(required);
    expect(
      EQUIPMENT_USE_LOG_OPTIONAL_REFS.filter(ref => required.includes(ref)),
    ).toEqual([]);
  });
});
