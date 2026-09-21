/**
 * A registry API for page tests.
 *
 * The pages read their composition lists from the Artifact Registry now
 * (NXD-029), so a test that renders one has to provide it.
 *
 * The compositions below are a fixture, not the files on disk. Two reasons.
 * These suites already build their Catalog entities inline, so a fixture is the
 * style they are written in; and a page test should assert that the page
 * renders what the registry gave it, not that production content happens to say
 * something. That the real manifests still derive the expected usage table is
 * asserted where the real manifests live —
 * `packages/platform-common/src/artifactManifestFiles.test.ts`.
 */

import {
  artifactRegistryApiRef,
  type ArtifactRegistryApi,
} from '@internal/plugin-marketplace';

function composition(
  name: string,
  displayName: string,
  usage: { kind: string; label: string } | undefined,
  components: { ref: string; version: string; optional?: boolean }[],
) {
  return {
    namespace: 'nexora',
    name,
    versions: [
      {
        // The loader registers everything as DRAFT, so that is what a test sees.
        version: '1.0.0',
        lifecycle: 'DRAFT',
        manifest: {
          apiVersion: 'nexora.dev/v1alpha1',
          kind: 'GOLDEN_PATH',
          metadata: {
            namespace: 'nexora',
            name,
            version: '1.0.0',
            displayName,
            description: displayName,
          },
          spec: {
            standardVersion: '1.0.0',
            ...(usage ? { usage } : {}),
            components,
          },
        },
      },
    ],
  };
}

const required = (ref: string) => ({ ref, version: '1.x' });
const optional = (ref: string) => ({ ref, version: '1.x', optional: true });

/**
 * A DATA_PRODUCT artifact fixture.
 *
 * Used to populate `builtFromIndex` in `goldenPathCompositionsFromManifests`:
 * a DATA_PRODUCT whose `spec.builtFrom` names a GOLDEN_PATH composition causes
 * the Composer to offer the corresponding Marketplace page and scaffolder
 * template for that composition's selection. GP-2.
 */
function dataProduct(
  name: string,
  displayName: string,
  builtFrom?: string,
) {
  return {
    namespace: 'nexora',
    name,
    versions: [
      {
        version: '1.0.0',
        lifecycle: 'DRAFT',
        manifest: {
          apiVersion: 'nexora.dev/v1alpha1',
          kind: 'DATA_PRODUCT',
          metadata: { namespace: 'nexora', name, version: '1.0.0', displayName },
          ...(builtFrom ? { spec: { builtFrom } } : {}),
        },
      },
    ],
  };
}

export const TEST_COMPOSITIONS = [
  composition(
    'equipment-use-log',
    'Equipment Use Log (design example)',
    { kind: 'design', label: 'Equipment Use Log (design example)' },
    [
      required('component:default/health'),
      required('component:default/observability'),
      required('component:default/mqtt-consumer'),
      required('component:default/rest-api'),
      optional('component:default/rest-source'),
      optional('component:default/timeseries'),
    ],
  ),
  composition(
    'machine-metrics-reference',
    'Machine Metrics Reference',
    { kind: 'runtime', label: 'Machine Metrics Reference' },
    [
      required('component:default/mqtt-consumer'),
      required('component:default/health'),
      required('component:default/observability'),
      required('component:default/timeseries'),
      required('component:default/rest-api'),
    ],
  ),
  composition(
    'machine-state-consumer',
    'Machine State Consumer',
    { kind: 'runtime', label: 'Machine State Consumer' },
    [required('component:default/unified-namespace')],
  ),
  composition(
    'mqtt-temperature-conceptual',
    'MQTT Temperature (conceptual)',
    { kind: 'conceptual', label: 'MQTT Temperature' },
    [
      required('component:default/mqtt-consumer'),
      required('component:default/rest-api'),
      required('component:default/health'),
      required('component:default/observability'),
    ],
  ),
  composition(
    'oee-data-product-direct',
    'OEE Data Product (Mode A)',
    { kind: 'runtime', label: 'OEE Data Product' },
    [
      required('component:default/health'),
      required('component:default/observability'),
      required('component:default/mqtt-consumer'),
      required('component:default/rest-source'),
      required('component:default/timeseries'),
      required('component:default/rest-api'),
    ],
  ),
  composition(
    'rest-equipment-conceptual',
    'REST Equipment (conceptual)',
    { kind: 'conceptual', label: 'REST Equipment' },
    [
      required('component:default/rest-source'),
      required('component:default/rest-api'),
      required('component:default/health'),
      required('component:default/observability'),
    ],
  ),
];

/** DATA_PRODUCT artifacts that carry `spec.builtFrom`, populating builtFromIndex. */
export const TEST_DATA_PRODUCTS = [
  dataProduct('oee-data-product', 'OEE Data Product', 'oee-data-product-direct'),
];

export const artifactRegistryApiMock: ArtifactRegistryApi = {
  listArtifactsWithVersions: async () => [
    ...TEST_COMPOSITIONS,
    ...TEST_DATA_PRODUCTS,
  ],
};

/** Drop-in entry for a `TestApiProvider` `apis` array. */
export const artifactRegistryApiEntry = [
  artifactRegistryApiRef,
  artifactRegistryApiMock,
] as const;
