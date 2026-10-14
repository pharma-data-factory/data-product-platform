/**
 * The provider's configuration, from the environment. It needs four facts
 * and holds one credential: the static token its target is bound to.
 */

import { homedir } from 'os';
import { join } from 'path';

export interface ProviderConfig {
  baseUrl: string;
  token: string;
  targetId: string;
  workDir: string;
  secretsDir?: string;
  network?: string;
  intervalSeconds: number;
}

export function readConfig(env: NodeJS.ProcessEnv): ProviderConfig {
  const missing = ['NEXORA_URL', 'NEXORA_PROVIDER_TOKEN', 'NEXORA_TARGET_ID'].filter(
    key => !env[key]?.trim(),
  );
  if (missing.length > 0) {
    throw new Error(`Missing environment: ${missing.join(', ')}`);
  }
  const interval = Number(env.NEXORA_PROVIDER_INTERVAL_SECONDS ?? '15');
  if (!Number.isFinite(interval) || interval < 2) {
    throw new Error('NEXORA_PROVIDER_INTERVAL_SECONDS must be a number of seconds, at least 2');
  }
  return {
    baseUrl: env.NEXORA_URL!.trim(),
    token: env.NEXORA_PROVIDER_TOKEN!.trim(),
    targetId: env.NEXORA_TARGET_ID!.trim(),
    workDir: env.NEXORA_PROVIDER_WORKDIR?.trim() || join(homedir(), '.nexora-provider'),
    ...(env.NEXORA_PROVIDER_SECRETS_DIR?.trim()
      ? { secretsDir: env.NEXORA_PROVIDER_SECRETS_DIR.trim() }
      : {}),
    ...(env.NEXORA_PROVIDER_NETWORK?.trim() ? { network: env.NEXORA_PROVIDER_NETWORK.trim() } : {}),
    intervalSeconds: interval,
  };
}
