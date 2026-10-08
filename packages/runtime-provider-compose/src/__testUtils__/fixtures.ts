/** A desired installation as the provider API serves it (NXD-143, NXD-144). */

import {
  computeInstallationConfigHash,
  type ProviderDesiredInstallation,
} from '@internal/platform-common';

export const DIGEST = `sha256:${'a'.repeat(64)}`;

export function desiredItem(
  overrides: Partial<ProviderDesiredInstallation> = {},
  desired: Partial<ProviderDesiredInstallation['desired']> = {},
): ProviderDesiredInstallation {
  const config = desired.config ?? { EQUIPMENT_ID: 'filler-01', MQTT_PASSWORD: { secretRef: 'mqtt/password' } };
  return {
    id: 'inst-1',
    name: 'oee',
    namespace: 'pharma',
    artifactName: 'oee',
    gmpRelevant: true,
    desired: {
      state: 'PRESENT',
      artifactRef: 'pharma/oee@1.0.0',
      version: '1.0.0',
      artifactVersionId: 'ver-1',
      imageRepository: 'ghcr.io/pharma/oee',
      imageDigest: DIGEST,
      config,
      configHash: computeInstallationConfigHash(config),
      revision: 3,
      changedBy: 'user:default/olga',
      changedAt: new Date('2026-10-08T00:00:00Z'),
      ...desired,
    },
    runtime: {
      kind: 'container',
      image: { repository: 'ghcr.io/pharma/oee' },
      ports: [{ name: 'http', containerPort: 8080 }],
      storage: [{ name: 'data', mountPath: '/app/data' }],
      resources: { limits: { cpu: '500m', memory: '512Mi' } },
    },
    configSchema: [
      { key: 'EQUIPMENT_ID', type: 'string', required: true },
      { key: 'MQTT_PORT', type: 'number', required: false, defaultValue: '1883' },
      { key: 'MQTT_PASSWORD', type: 'secret', required: false, defaultValue: 'never-used' },
    ],
    ...overrides,
  };
}
