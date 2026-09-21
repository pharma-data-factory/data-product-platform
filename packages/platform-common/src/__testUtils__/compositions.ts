/**
 * The Golden Path compositions on disk, for tests that need real ones.
 *
 * Core no longer carries the component lists as constants (NXD-029), so a test
 * that used to import `OEE_DIRECT_COMPOSITION_REFS` reads the manifest the
 * registry reads instead. That keeps the assertions about real content rather
 * than about a fixture that can drift from it — which is the whole reason the
 * constants had to go.
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import type { ArtifactManifest } from '../artifact';
import {
  compositionOfArtifactManifest,
  compositionUsageFromManifests,
  type CompositionUsage,
  type GoldenPathComposition,
} from '../composition';

const ARTIFACT_DIR = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'catalog',
  'artifacts',
  'nexora',
);

export function artifactManifestsOnDisk(): ArtifactManifest[] {
  return readdirSync(ARTIFACT_DIR)
    .filter(file => file.endsWith('.yaml') && file !== 'publisher.yaml')
    .sort()
    .map(
      file =>
        parseYaml(readFileSync(join(ARTIFACT_DIR, file), 'utf8')) as ArtifactManifest,
    );
}

/** Required component refs of one composition, in manifest order. */
export function compositionRefsOnDisk(name: string): string[] {
  for (const manifest of artifactManifestsOnDisk()) {
    const composition = compositionOfArtifactManifest(manifest);
    if (composition?.metadata.name === name) {
      return composition.spec.components
        .filter(entry => !entry.optional)
        .map(entry => entry.ref);
    }
  }
  throw new Error(`No GOLDEN_PATH composition named ${name} on disk`);
}

/** Refs a composition offers but does not require, in manifest order. */
export function optionalCompositionRefsOnDisk(name: string): string[] {
  for (const manifest of artifactManifestsOnDisk()) {
    const composition = compositionOfArtifactManifest(manifest);
    if (composition?.metadata.name === name) {
      return composition.spec.components
        .filter(entry => entry.optional)
        .map(entry => entry.ref);
    }
  }
  throw new Error(`No GOLDEN_PATH composition named ${name} on disk`);
}

export function compositionUsageOnDisk(): CompositionUsage[] {
  return compositionUsageFromManifests(artifactManifestsOnDisk());
}

/** The full GoldenPathComposition for one named GOLDEN_PATH manifest. */
export function compositionOnDisk(name: string): GoldenPathComposition {
  for (const manifest of artifactManifestsOnDisk()) {
    const composition = compositionOfArtifactManifest(manifest);
    if (composition?.metadata.name === name) {
      return composition;
    }
  }
  throw new Error(`No GOLDEN_PATH composition named ${name} on disk`);
}
