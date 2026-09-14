#!/usr/bin/env node
/**
 * Prepare deploy/production.local.env for a local production smoke run.
 *
 * Cross-platform replacement for prepare-production-local-env.ps1, which only
 * runs on Windows and therefore not in the Linux devcontainer or on Ona.
 *
 * Generates a throwaway RSA key so Octokit can parse GITHUB_APP_* at boot.
 * Sign-in and repository publishing still need real GitHub credentials.
 *
 *   node scripts/prepare-production-local-env.mjs [--port 7007] [--force]
 */
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXAMPLE = join(ROOT, 'deploy', 'production.local.env.example');
const TARGET = join(ROOT, 'deploy', 'production.local.env');

const args = process.argv.slice(2);
const force = args.includes('--force');
const portIndex = args.indexOf('--port');
const port = portIndex === -1 ? '7007' : args[portIndex + 1];

if (!/^\d+$/.test(port)) {
  console.error(`Invalid --port value: ${port}`);
  process.exit(2);
}
if (!existsSync(EXAMPLE)) {
  console.error(`Missing ${EXAMPLE}`);
  process.exit(1);
}
if (existsSync(TARGET) && !force) {
  console.log(`Exists: ${TARGET} (pass --force to overwrite)`);
  process.exit(0);
}

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
// The env file holds the PEM on a single line with escaped newlines.
const oneLineKey = privateKey.replace(/\r?\n/g, '\\n');

const base = `http://localhost:${port}`;
const overrides = new Map([
  ['APP_BASE_URL', base],
  ['BACKEND_BASE_URL', base],
  ['CONTROL_PLANE_PORT', port],
  ['AUTH_GITHUB_CALLBACK_URL', `${base}/api/auth/github/handler/frame`],
  ['GITHUB_APP_ID', '999001'],
  ['GITHUB_PRIVATE_KEY', oneLineKey],
]);

// Line-based rather than regex replacement: the PEM contains characters that
// are special in a regex replacement string.
const lines = readFileSync(EXAMPLE, 'utf8').split(/\r?\n/);
const seen = new Set();
const out = lines.map(line => {
  const match = /^([A-Z0-9_]+)=/.exec(line);
  if (!match || !overrides.has(match[1])) {
    return line;
  }
  seen.add(match[1]);
  return `${match[1]}=${overrides.get(match[1])}`;
});

const missing = [...overrides.keys()].filter(key => !seen.has(key));
if (missing.length > 0) {
  console.error(
    `Template ${EXAMPLE} is missing expected keys: ${missing.join(', ')}`,
  );
  process.exit(1);
}

writeFileSync(TARGET, out.join('\n'));
console.log(`Wrote ${TARGET} (port ${port}, throwaway GitHub App key)`);
console.log('Next: yarn docker:prod:build && yarn docker:prod:up');
