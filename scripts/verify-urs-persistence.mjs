#!/usr/bin/env node
/**
 * URS-Persistenz-Smoke-Test (read-only).
 *
 * Prüft die lokale PostgreSQL-Datenbank `backstage_plugin_urs-composer`:
 *   - Approval-Workflows (Soll: standard-gxp-urs + non-gxp-urs)
 *   - Requirement Sets (Seed- vs. selbst angelegte)
 *   - Ob das erwartete Set (Default: URS-CMP-MTY6WBZZ) noch vorhanden ist.
 *
 * Zweimal ausführen, um Persistenz über einen Neustart zu beweisen:
 *   1) direkt nach dem Import (Create → Import JSON → Save Draft),
 *   2) nach einem `yarn start`-Neustart.
 *
 * Exit-Code:
 *   0 = erwartetes Set ODER ein beliebiges selbst angelegtes Set vorhanden
 *   1 = kein selbst angelegtes Set (nur Seeds) → Import fehlt
 *   2 = Postgres nicht erreichbar
 *
 * Umgebung (Defaults passen zum lokalen nexora-urs-pg-Container):
 *   URS_PG_HOST / URS_PG_PORT / URS_PG_USER / URS_PG_PASSWORD / URS_PG_DB
 *   URS_EXPECTED_KEY   (Default: URS-CMP-MTY6WBZZ)
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(repoRoot, 'package.json'));
const knexFactory = require('knex');

const conn = {
  host: process.env.URS_PG_HOST ?? '127.0.0.1',
  port: Number(process.env.URS_PG_PORT ?? 5435),
  user: process.env.URS_PG_USER ?? 'urs_test',
  password: process.env.URS_PG_PASSWORD ?? 'test_pass123',
  database: process.env.URS_PG_DB ?? 'backstage_plugin_urs-composer',
};
const expectedKey = process.env.URS_EXPECTED_KEY ?? 'URS-CMP-MTY6WBZZ';

const knex = knexFactory({ client: 'pg', connection: conn });

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
    const workflows = await knex('approval_workflows')
      .select('id')
      .orderBy('id');
    console.log(`Workflows (${workflows.length}):`);
    for (const w of workflows) console.log(`  - ${w.id}`);

    const sets = await knex('requirement_sets')
      .select('id', 'requirement_set_id', 'status', 'solution_name', 'created_at')
      .orderBy('created_at');
    const seedSets = sets.filter(s => String(s.id).startsWith('seed:'));
    const customSets = sets.filter(s => !String(s.id).startsWith('seed:'));

    console.log(
      `\nRequirement Sets (${sets.length} gesamt: ${seedSets.length} Seed, ${customSets.length} selbst angelegt):`,
    );
    for (const s of sets) {
      const kind = String(s.id).startsWith('seed:') ? 'seed' : 'user';
      console.log(
        `  ${kind.padEnd(4)} | ${s.requirement_set_id} | ${s.status} | ${s.solution_name ?? ''}`,
      );
    }

    const [versions] = await knex('requirement_versions').count({ n: '*' });
    const [baselines] = await knex('baselines').count({ n: '*' });
    console.log(
      `\nRequirement-Versionen: ${versions.n} | Baselines: ${baselines.n}`,
    );

    const expected = sets.find(s => s.requirement_set_id === expectedKey);
    if (expected) {
      console.log(
        `\n✓ PERSISTIERT: "${expectedKey}" ist in der DB (Status: ${expected.status}).`,
      );
      process.exitCode = 0;
    } else if (customSets.length > 0) {
      console.log(
        `\n✓ Persistenz bestätigt: selbst angelegte Sets vorhanden (${customSets
          .map(s => s.requirement_set_id)
          .join(', ')}).`,
      );
      console.log(`  Hinweis: "${expectedKey}" wurde nicht gefunden.`);
      process.exitCode = 0;
    } else {
      console.log(`\n✗ KEIN selbst angelegtes Set — "${expectedKey}" fehlt.`);
      console.log(
        '  → Import in der UI ausführen (Create → Import JSON → Save Draft), dann erneut prüfen.',
      );
      process.exitCode = 1;
    }
  } finally {
    await knex.destroy();
  }
}

main().catch(err => {
  console.error('Fehler:', err.message);
  process.exit(1);
});
