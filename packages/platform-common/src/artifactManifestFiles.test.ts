/**
 * The manifests under `catalog/artifacts/` must be what the registry expects.
 *
 * They are the registry's content source, hand-committed and loaded at
 * startup. A file that fails validation does not stop the backend — the loader
 * reports it and carries on, by design — so nothing at runtime turns a broken
 * manifest into a loud failure. This suite is that loud failure, at build time
 * instead.
 *
 * What it cannot check, and why: the legacy `marketplaceItems` array lives in
 * a frontend plugin, and nothing that may read the filesystem is allowed to
 * depend on one. So the two halves are checked separately — the array maps to
 * manifests in `plugins/marketplace/src/registryParity.test.ts`, and the files
 * are checked here. The named list below is the seam between them: adding an
 * offering means adding a file and a name here, and forgetting either fails.
 * The seam disappears in the slice that deletes the array, at which point the
 * files are the only copy and there is nothing left to hold in step.
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import {
  validateArtifactManifest,
  type ArtifactManifest,
} from './artifact';
import { marketplaceViewOfManifest } from './marketplace-artifact';

const MANIFEST_ROOT = join(__dirname, '..', '..', '..', 'catalog', 'artifacts');
const NEXORA_DIR = join(MANIFEST_ROOT, 'nexora');
const PUBLISHER_FILE = 'publisher.yaml';

/**
 * The offerings the Control Plane ships, by artifact name.
 *
 * Kept sorted and spelled out rather than derived from the directory, because
 * a list derived from the directory would agree with the directory no matter
 * what the directory contained.
 */
const EXPECTED_ARTIFACTS = [
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
];

function read(file: string): unknown {
  return parseYaml(readFileSync(join(NEXORA_DIR, file), 'utf8'));
}

const files = readdirSync(NEXORA_DIR).filter(f => f.endsWith('.yaml')).sort();
const artifactFiles = files.filter(f => f !== PUBLISHER_FILE);

describe('artifact manifests on disk', () => {
  it('holds exactly the offerings the Control Plane ships', () => {
    expect(artifactFiles).toEqual(
      EXPECTED_ARTIFACTS.map(name => `${name}.yaml`),
    );
  });

  it('declares the publisher that owns the namespace', () => {
    const publisher = read(PUBLISHER_FILE) as {
      kind: string;
      metadata: { namespace: string; displayName: string };
      spec?: { memberGroups?: string[] };
    };
    expect(publisher.kind).toBe('Publisher');
    expect(publisher.metadata.namespace).toBe('nexora');
    expect(publisher.metadata.displayName).toBeTruthy();
  });

  it.each(artifactFiles)('%s is a manifest the registry accepts', file => {
    expect(validateArtifactManifest(read(file))).toEqual([]);
  });

  it.each(artifactFiles)('%s is named after its artifact', file => {
    const manifest = read(file) as ArtifactManifest;
    expect(`${manifest.metadata.name}.yaml`).toBe(file);
  });

  it.each(artifactFiles)(
    '%s round-trips to a complete Marketplace offering',
    file => {
      // The registry is about to become what the Marketplace reads. A manifest
      // the Marketplace cannot render back into an offering would silently
      // drop a card from the catalogue after the switch.
      expect(marketplaceViewOfManifest(read(file) as ArtifactManifest)).toBeDefined();
    },
  );

  it('registers everything into the namespace the publisher owns', () => {
    const namespaces = new Set(
      artifactFiles.map(f => (read(f) as ArtifactManifest).metadata.namespace),
    );
    expect([...namespaces]).toEqual(['nexora']);
  });

  it('gives every offering a distinct coordinate', () => {
    const refs = artifactFiles.map(f => {
      const { metadata } = read(f) as ArtifactManifest;
      return `${metadata.namespace}/${metadata.name}@${metadata.version}`;
    });
    expect(new Set(refs).size).toBe(refs.length);
  });

  it('claims no lifecycle or certification of its own', () => {
    // Registration yields DRAFT with no certification status. A manifest that
    // set either would be asking the registry to trust the artifact's own
    // account of whether it has been reviewed. See NXD-019.
    for (const file of artifactFiles) {
      const manifest = read(file) as ArtifactManifest;
      expect(manifest.spec).not.toHaveProperty('lifecycle');
      expect(manifest.spec).not.toHaveProperty('certificationStatus');
    }
  });
});
