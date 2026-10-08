/**
 * The Docker Compose provider's entry point (NXD-144).
 *
 *   NEXORA_URL=http://localhost:7007 \
 *   NEXORA_PROVIDER_TOKEN=… NEXORA_TARGET_ID=… \
 *   yarn workspace @internal/runtime-provider-compose start [--once]
 *
 * Pulls on an interval; `--once` runs one pass and exits non-zero if any
 * installation failed. It runs beside Docker, never inside the Backstage
 * backend: Nexora decides, this executes (NXD-129).
 */

import { createNexoraApi } from './api';
import { readConfig } from './config';
import { createDockerCli } from './docker';
import { reconcile } from './reconcile';
import { createFileSecretResolver } from './secrets';

/** Waits `ms`, waking early once `stopped()` is true. */
async function sleepUnless(stopped: () => boolean, ms: number): Promise<void> {
  const until = Date.now() + ms;
  while (!stopped() && Date.now() < until) {
    await new Promise(r => setTimeout(r, 250));
  }
}

async function main() {
  const config = readConfig(process.env);
  const once = process.argv.includes('--once');
  const log = (text: string) => console.log(`${new Date().toISOString()} ${text}`);
  const options = {
    api: createNexoraApi(config),
    docker: createDockerCli(),
    resolveSecret: createFileSecretResolver(config.secretsDir),
    workDir: config.workDir,
    network: config.network,
    log,
  };

  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  const isStopping = () => stopping;

  do {
    try {
      const outcomes = await reconcile(options);
      for (const o of outcomes) {
        log(`${o.project}: ${o.action}${o.report ? ` → ${o.report.state} r${o.report.desiredRevision}` : ''}`);
      }
      if (once && outcomes.some(o => o.action === 'failed')) process.exitCode = 1;
    } catch (error) {
      log(`pass failed: ${String((error as Error).message ?? error)}`);
      if (once) process.exitCode = 1;
    }
    if (once) break;
    await sleepUnless(isStopping, config.intervalSeconds * 1000);
  } while (!stopping);
}

main().catch(error => {
  console.error(String(error?.message ?? error));
  process.exit(1);
});
