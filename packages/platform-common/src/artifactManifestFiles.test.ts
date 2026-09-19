/**
 * The manifests under `catalog/artifacts/` must be what the registry expects.
 *
 * They are the registry's content source, hand-committed and loaded at
 * startup. A file that fails validation does not stop the backend — the loader
 * reports it and carries on, by design — so nothing at runtime turns a broken
 * manifest into a loud failure. This suite is that loud failure, at build time
 * instead.
 *
 * These files are now the only copy. While the legacy `marketplaceItems` array
 * still existed, this suite also carried a spelled-out list of the twelve names
 * as its half of the seam holding array and files in step. The array is gone,
 * so the list went with it: enumerating the directory's contents in a test
 * beside the directory would be the second copy this transformation exists to
 * remove. What is checked instead is that whatever the directory holds is
 * loadable, nameable and renderable.
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import {
  validateArtifactManifest,
  type ArtifactManifest,
} from './artifact';
import {
  MARKETPLACE_CATEGORY_KINDS,
  MARKETPLACE_SPEC_KEY,
  marketplaceViewOfManifest,
} from './marketplace-artifact';

const MANIFEST_ROOT = join(__dirname, '..', '..', '..', 'catalog', 'artifacts');
const NEXORA_DIR = join(MANIFEST_ROOT, 'nexora');
const PUBLISHER_FILE = 'publisher.yaml';

function read(file: string): unknown {
  return parseYaml(readFileSync(join(NEXORA_DIR, file), 'utf8'));
}

const files = readdirSync(NEXORA_DIR).filter(f => f.endsWith('.yaml')).sort();
const artifactFiles = files.filter(f => f !== PUBLISHER_FILE);

describe('artifact manifests on disk', () => {
  it('holds the offerings the Control Plane ships', () => {
    // Not a count and not a list: the directory is the source, so the only
    // thing a test beside it can honestly assert is that it is not empty.
    // An empty directory means an empty Marketplace, which is worth failing on.
    expect(artifactFiles.length).toBeGreaterThan(0);
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
      // The registry is what the Marketplace reads, and these files are what
      // the registry holds. A manifest the Marketplace cannot render back into
      // an offering silently drops a card from the catalogue.
      expect(marketplaceViewOfManifest(read(file) as ArtifactManifest)).toBeDefined();
    },
  );

  it.each(artifactFiles)('%s files itself under its own kind', file => {
    const manifest = read(file) as ArtifactManifest;
    const marketplace = manifest.spec?.[MARKETPLACE_SPEC_KEY] as {
      category?: string;
    };
    expect(MARKETPLACE_CATEGORY_KINDS[marketplace?.category ?? '']).toBe(
      manifest.kind,
    );
  });

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
    //
    // The Marketplace block is checked too, and that is the newer half: it is
    // where the legacy claim used to travel as display metadata. The UI reads
    // the registry now, so a value left there would be a claim nothing renders
    // and nothing stands behind. See NXD-025.
    for (const file of artifactFiles) {
      const manifest = read(file) as ArtifactManifest;
      expect(manifest.spec).not.toHaveProperty('lifecycle');
      expect(manifest.spec).not.toHaveProperty('certificationStatus');
      expect(manifest.spec?.[MARKETPLACE_SPEC_KEY]).not.toHaveProperty(
        'certificationStatus',
      );
    }
  });
});
