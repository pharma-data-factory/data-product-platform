#!/usr/bin/env node
/**
 * Explicit URS content seed for Neuinstallation / Testsysteme.
 *
 * Runs schema migrations, then idempotent content seed (capabilities,
 * workflows, roles, demo URS e.g. URS-WD, genesis versions).
 *
 * Not invoked on backend start — call once when bootstrapping Postgres:
 *   yarn urs:seed
 *
 * Umgebung (Defaults passen zum lokalen nexora-urs-pg-Container):
 *   URS_PG_HOST / URS_PG_PORT / URS_PG_USER / URS_PG_PASSWORD / URS_PG_DB
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(repoRoot, 'package.json'));
const knexFactory = require('knex');
const esbuild = require('esbuild');

const conn = {
  host: process.env.URS_PG_HOST ?? '127.0.0.1',
  port: Number(process.env.URS_PG_PORT ?? 5435),
  user: process.env.URS_PG_USER ?? 'urs_test',
  password: process.env.URS_PG_PASSWORD ?? 'test_pass123',
  database: process.env.URS_PG_DB ?? 'backstage_plugin_urs-composer',
};

const knex = knexFactory({ client: 'pg', connection: conn });

async function loadSeedRunner() {
  const entry = path.join(
    repoRoot,
    'plugins/urs-composer-backend/src/cli/seedMain.ts',
  );
  const outfile = path.join(os.tmpdir(), `nexora-urs-seed-${process.pid}.cjs`);
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile,
    // Keep native / heavy runtime deps external
    external: ['knex', 'pg', 'better-sqlite3', 'sqlite3'],
    logLevel: 'silent',
  });
  try {
    // Fresh require each run
    delete require.cache[outfile];
    return require(outfile);
  } finally {
    fs.unlink(outfile, () => {});
  }
}

async function main() {
  try {
    await knex.raw('select 1');
  } catch (err) {
    console.error(
      `✗ Postgres nicht erreichbar (${conn.host}:${conn.port}/${conn.database}): ${err.message}`,
    );
    process.exit(2);
  }

  try {
    console.log(`Migrating + seeding ${conn.host}:${conn.port}/${conn.database}…`);
    const { runUrsSeed } = await loadSeedRunner();
    const counts = await runUrsSeed(knex);
    console.log(
      `✓ Seed fertig — capabilities: ${counts.capabilities}, requirement sets: ${counts.requirementSets}, versions: ${counts.versions}`,
    );
  } catch (err) {
    console.error('✗ Seed fehlgeschlagen:', err.message);
    process.exitCode = 1;
  } finally {
    await knex.destroy();
  }
}

main().catch(err => {
  console.error('Fehler:', err.message);
  process.exit(1);
});
