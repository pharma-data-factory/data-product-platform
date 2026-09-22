/**
 * First-install seeding.
 *
 * The property under test is the one the whole move to a database exists for:
 * a restart must not rewrite what an administrator changed. Everything else
 * here is about what a *first* install is allowed to contain.
 */

import knex, { Knex } from 'knex';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { up } from './migrations';
import { seed } from './seeds';

const SEED_YAML = `apiVersion: backstage.io/v1alpha1
kind: User
metadata:
  name: demo-admin
spec:
  profile:
    displayName: Demo Admin
  memberOf: [platform-admins]
---
apiVersion: backstage.io/v1alpha1
kind: User
metadata:
  name: demo-viewer
spec:
  memberOf: [platform-viewers]
`;

describe('users first-install seed', () => {
  let db: Knex;
  let seedFile: string;
  let tmp: string;
  const log = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.raw('select 1');
    await up(db);
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'users-seed-'));
    seedFile = path.join(tmp, 'users.seed.yaml');
    fs.writeFileSync(seedFile, SEED_YAML, 'utf8');
  });

  afterEach(async () => {
    await db?.destroy();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('seeds the committed users into an empty table', async () => {
    const result = await seed(db, { seedFile, log });
    expect(result).toEqual({ seeded: 2, reason: 'DEMO_USERS' });
    const rows = await db('platform_users').select();
    expect(rows.map(r => r.name).sort()).toEqual(['demo-admin', 'demo-viewer']);
  });

  it('does nothing on a second run, and does not undo a role change', async () => {
    await seed(db, { seedFile, log });
    await db('platform_users')
      .where({ name: 'demo-admin' })
      .update({ member_of: JSON.stringify(['platform-viewers']) });

    const second = await seed(db, { seedFile, log });

    expect(second).toEqual({ seeded: 0, reason: 'ALREADY_POPULATED' });
    const row = await db('platform_users').where({ name: 'demo-admin' }).first();
    // The demotion survives. Before this change the committed YAML was the
    // store, so a restart restored platform-admins silently.
    expect(JSON.parse(row.member_of)).toEqual(['platform-viewers']);
  });

  it('refuses demo accounts in production and installs the bootstrap admin', async () => {
    // The committed file carries demo accounts, two of them administrators.
    // Seeding those into a real deployment would create administrators nobody
    // asked for, and because the seed never runs again they would stay.
    const result = await seed(db, {
      seedFile,
      log,
      environment: 'production',
      bootstrapAdmin: 'schmeckm_roche',
    });
    expect(result).toEqual({ seeded: 1, reason: 'BOOTSTRAP_ADMIN' });
    const rows = await db('platform_users').select();
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('schmeckm_roche');
    expect(JSON.parse(rows[0].member_of)).toEqual(['platform-admins']);
  });

  it('seeds nobody in production without a bootstrap admin, and says why', async () => {
    const result = await seed(db, { seedFile, log, environment: 'production' });
    expect(result).toEqual({ seeded: 0, reason: 'NOTHING' });
    expect(await db('platform_users').select()).toHaveLength(0);
    expect(log.mock.calls.flat().join(' ')).toMatch(/users.bootstrapAdmin/);
  });

  it('tolerates a missing seed file', async () => {
    const result = await seed(db, {
      seedFile: path.join(tmp, 'absent.yaml'),
      log,
    });
    expect(result).toEqual({ seeded: 0, reason: 'NOTHING' });
  });
});
