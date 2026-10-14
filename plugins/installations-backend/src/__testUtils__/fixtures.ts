/**
 * Shared fixtures: a registry that answers like the Artifact Registry's
 * `GET /artifacts/:ns/:name/versions/:version`, a classifier and a PIN check
 * that record their calls.
 */

import knex, { Knex } from 'knex';
import { NotAllowedError } from '@backstage/errors';
import {
  ARTIFACT_MANIFEST_API_VERSION,
  formatArtifactRef,
  type ArtifactCoordinate,
  type ArtifactLifecycle,
  type ArtifactVersion,
} from '@internal/platform-common';
import type { GmpClassification } from '../clients';
import { InstallationsRepository } from '../repository';
import type { ActContext } from '../service';

export const OPERATOR = 'user:default/olga-operator';
export const RIGHT_PIN = 'right-pin';
export const DIGEST_1 = `sha256:${'a'.repeat(64)}`;
export const DIGEST_2 = `sha256:${'b'.repeat(64)}`;

export function releasedVersion(
  version: string,
  options: { lifecycle?: ArtifactLifecycle; build?: boolean; digest?: string } = {},
): ArtifactVersion {
  return {
    id: `ver-${version}`,
    artifactId: 'art-oee',
    version,
    lifecycle: options.lifecycle ?? 'RELEASED',
    manifest: {
      apiVersion: ARTIFACT_MANIFEST_API_VERSION,
      kind: 'DATA_PRODUCT',
      metadata: { namespace: 'pharma', name: 'oee', version },
      spec: {
        runtime: { kind: 'container', image: { repository: 'ghcr.io/pharma/oee' } },
        config: [
          { key: 'EQUIPMENT_ID', type: 'string', required: true },
          { key: 'MQTT_PORT', type: 'number', required: false, defaultValue: '1883' },
          { key: 'MQTT_PASSWORD', type: 'secret', required: false },
        ],
      },
    },
    ...(options.build === false
      ? {}
      : {
          releaseBuild: {
            imageRepository: 'ghcr.io/pharma/oee',
            imageDigest: options.digest ?? DIGEST_1,
            commitSha: 'c'.repeat(40),
          },
        }),
    createdBy: 'user:default/publisher',
    createdAt: new Date('2026-10-06T00:00:00Z'),
    revision: 1,
  };
}

export function fakeWorld() {
  const versions = new Map<string, ArtifactVersion>([
    ['pharma/oee@1.0.0', releasedVersion('1.0.0')],
    ['pharma/oee@1.1.0', releasedVersion('1.1.0', { digest: DIGEST_2 })],
    ['pharma/oee@2.0.0', releasedVersion('2.0.0', { lifecycle: 'CERTIFIED' })],
    ['pharma/oee@0.9.0', releasedVersion('0.9.0', { build: false })],
  ]);
  const state = {
    classification: { gmpRelevant: true, source: 'PRODUCT' } as GmpClassification,
    calls: [] as string[],
  };
  const readVersion = jest.fn(async (coordinate: ArtifactCoordinate) => {
    state.calls.push('read');
    return versions.get(formatArtifactRef(coordinate));
  });
  const classify = jest.fn(async (_artifact: { namespace: string; name: string }) => {
    state.calls.push('classify');
    return state.classification;
  });
  const verifyPin = jest.fn(async (pin: string) => {
    state.calls.push('pin');
    if (pin !== RIGHT_PIN) {
      throw new NotAllowedError('Re-authentication failed. Signature rejected.');
    }
    return 'signature-pin';
  });
  const ctx = (actor = OPERATOR): ActContext => ({ actor, readVersion, classify, verifyPin });
  return { versions, state, readVersion, classify, verifyPin, ctx };
}

export async function sqliteRepository(): Promise<{
  db: Knex;
  repository: InstallationsRepository;
}> {
  const db = knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
  const repository = await InstallationsRepository.create({ getClient: () => db });
  return { db, repository };
}
