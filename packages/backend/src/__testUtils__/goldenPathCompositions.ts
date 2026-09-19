/**
 * Reads a Golden Path composition from the Artifact manifests on disk.
 *
 * Compositions used to be their own manifest family under
 * `catalog/compositions/`, parsed straight out of YAML text. They are
 * GOLDEN_PATH Artifacts now (NXD-027), so a test that wants one reads the
 * artifact manifest and runs it through the same adapter the registry's
 * consumers use, rather than parsing a second format.
 *
 * This lives in one place because four suites need it. Three of them already
 * carried their own `read` helper before the move; adding a fourth copy is
 * what NXD-021 and NXD-024 both warned about.
 */

import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import {
  compositionOfArtifactManifest,
  type ArtifactManifest,
  type GoldenPathComposition,
} from '@internal/platform-common';

const ROOT = path.resolve(__dirname, '../../../..');
const ARTIFACT_DIR = path.join(ROOT, 'catalog', 'artifacts', 'nexora');

/** The composition declared by `<name>.yaml`, or a throw naming the file. */
export function readGoldenPathComposition(name: string): GoldenPathComposition {
  const file = path.join(ARTIFACT_DIR, `${name}.yaml`);
  const manifest = parseYaml(fs.readFileSync(file, 'utf8')) as ArtifactManifest;
  const composition = compositionOfArtifactManifest(manifest);
  if (!composition) {
    throw new Error(
      `catalog/artifacts/nexora/${name}.yaml is not a valid GOLDEN_PATH ` +
        `composition manifest`,
    );
  }
  return composition;
}

/** The component refs of `<name>.yaml`, required only, in manifest order. */
export function readCompositionRefs(name: string): string[] {
  return readGoldenPathComposition(name)
    .spec.components.filter(entry => !entry.optional)
    .map(entry => entry.ref);
}
