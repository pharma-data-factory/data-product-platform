/**
 * The GOLDEN_PATH Artifact manifests under `catalog/artifacts/nexora/` are the
 * source of truth for which Platform Components a composition is built from.
 * Core still keeps a second, hand-maintained copy of the same lists as
 * TypeScript constants in `platform-component-library.ts`, which the Composer,
 * the Marketplace and the Developer Hub read.
 *
 * Nothing kept the two in step. They agree today, and this test is what keeps
 * them agreeing until the constants are replaced by resolution through the
 * registry — at which point the duplication, and this test with it, goes away.
 * Until then a manifest edit that forgets the constant (or the reverse) fails
 * here instead of silently giving the Composer a different answer from the
 * Catalog.
 *
 * The manifests moved out of `catalog/compositions/` and became Artifacts in
 * NXD-027; before that move they were read by no runtime code at all, which is
 * why the constants were the de-facto truth rather than the copy.
 *
 * See docs/nexora-transformation/HARDCODED_DOMAIN_INVENTORY.md (GP-1).
 */
import {
  EQUIPMENT_USE_LOG_OPTIONAL_REFS,
  EQUIPMENT_USE_LOG_REQUIRED_REFS,
  MACHINE_METRICS_COMPOSITION_REFS,
  MACHINE_STATE_COMPOSITION_REFS,
  MQTT_TEMPERATURE_CONCEPTUAL_REFS,
  OEE_DIRECT_COMPOSITION_REFS,
  REST_EQUIPMENT_CONCEPTUAL_REFS,
} from '@internal/platform-common';
import {
  readCompositionRefs,
  readGoldenPathComposition,
} from './__testUtils__/goldenPathCompositions';

const DUPLICATED_COMPOSITIONS: ReadonlyArray<{
  constant: string;
  refs: readonly string[];
  manifest: string;
}> = [
  {
    constant: 'OEE_DIRECT_COMPOSITION_REFS',
    refs: OEE_DIRECT_COMPOSITION_REFS,
    manifest: 'oee-data-product-direct',
  },
  {
    constant: 'MACHINE_METRICS_COMPOSITION_REFS',
    refs: MACHINE_METRICS_COMPOSITION_REFS,
    manifest: 'machine-metrics-reference',
  },
  {
    constant: 'MACHINE_STATE_COMPOSITION_REFS',
    refs: MACHINE_STATE_COMPOSITION_REFS,
    manifest: 'machine-state-consumer',
  },
  {
    constant: 'MQTT_TEMPERATURE_CONCEPTUAL_REFS',
    refs: MQTT_TEMPERATURE_CONCEPTUAL_REFS,
    manifest: 'mqtt-temperature-conceptual',
  },
  {
    constant: 'REST_EQUIPMENT_CONCEPTUAL_REFS',
    refs: REST_EQUIPMENT_CONCEPTUAL_REFS,
    manifest: 'rest-equipment-conceptual',
  },
];

describe('composition manifest parity', () => {
  it.each(DUPLICATED_COMPOSITIONS)(
    '$constant matches $manifest',
    ({ refs, manifest }) => {
      expect([...refs]).toEqual(readCompositionRefs(manifest));
    },
  );

  it('keeps the Equipment Use Log required/optional split consistent', () => {
    // The optional pair used to be named only in Core, because the old
    // composition format could not express optionality. The manifest carries
    // both halves now, so both are checked against it rather than one against
    // the file and the other against itself.
    const composition = readGoldenPathComposition('equipment-use-log');
    const required = composition.spec.components
      .filter(entry => !entry.optional)
      .map(entry => entry.ref);
    const optional = composition.spec.components
      .filter(entry => entry.optional)
      .map(entry => entry.ref);

    expect([...EQUIPMENT_USE_LOG_REQUIRED_REFS]).toEqual(required);
    expect([...EQUIPMENT_USE_LOG_OPTIONAL_REFS]).toEqual(optional);

    // A component required and optional at once would make the Composer's
    // offer contradict its own requirement.
    expect(required.filter(ref => optional.includes(ref))).toEqual([]);
  });
});
