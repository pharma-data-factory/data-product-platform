/**
 * First-install seeding. Runs once, against an empty table.
 *
 * Follows the pattern `urs-composer-backend` already uses: migrate, then seed,
 * and the seed is a no-op on every subsequent start. A restart must never
 * rewrite what an administrator changed — that is the whole reason these
 * records left the YAML file.
 */

import { Knex } from 'knex';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

export interface SeedOptions {
  /** `auth.environment`. Demo accounts are refused in production. */
  environment?: string;
  /** GitHub login to install as the sole PLATFORM_ADMIN in production. */
  bootstrapAdmin?: string;
  /** Committed first-install file. Absolute path. */
  seedFile: string;
  log: (message: string) => void;
}

export interface SeedResult {
  seeded: number;
  reason: 'ALREADY_POPULATED' | 'DEMO_USERS' | 'BOOTSTRAP_ADMIN' | 'NOTHING';
}

function readSeedFile(file: string): Array<{
  name: string;
  displayName?: string;
  memberOf: string[];
}> {
  if (!fs.existsSync(file)) {
    return [];
  }
  return YAML.parseAllDocuments(fs.readFileSync(file, 'utf8'))
    .filter(doc => Boolean(doc) && !doc.errors?.length)
    .map(doc => doc.toJS())
    .filter(
      (v): v is Record<string, any> =>
        v !== null && typeof v === 'object' && v.kind === 'User',
    )
    .map(v => ({
      name: String(v.metadata?.name ?? ''),
      displayName: v.spec?.profile?.displayName,
      memberOf: Array.isArray(v.spec?.memberOf) ? v.spec.memberOf : [],
    }))
    .filter(u => u.name);
}

export async function seed(
  knex: Knex,
  options: SeedOptions,
): Promise<SeedResult> {
  const [{ count } = { count: 0 }] = await knex('platform_users').count(
    '* as count',
  );
  if (Number(count) > 0) {
    // The decisive line. Everything else in this file is about what a *first*
    // install looks like.
    return { seeded: 0, reason: 'ALREADY_POPULATED' };
  }

  const now = new Date();

  // In production the committed file is the wrong content: it carries demo
  // accounts — viewer, developer, owner, admin and four urs-* reviewers — and
  // two of them hold platform-admins. Seeding those into a real deployment
  // would create administrator accounts nobody asked for, and because the seed
  // never runs again they would stay until someone noticed.
  if (options.environment === 'production') {
    if (!options.bootstrapAdmin) {
      options.log(
        'No users seeded: auth.environment is production and no ' +
          'users.bootstrapAdmin is configured. Set it to the GitHub login of ' +
          'the first administrator, otherwise nobody can administer the ' +
          'platform.',
      );
      return { seeded: 0, reason: 'NOTHING' };
    }
    await knex('platform_users').insert({
      name: options.bootstrapAdmin,
      display_name: options.bootstrapAdmin,
      member_of: JSON.stringify(['platform-admins']),
      created_by: 'system:first-install',
      created_at: now,
    });
    options.log(
      `Seeded bootstrap administrator "${options.bootstrapAdmin}". ` +
        'This runs once; later changes are made in Admin → Users & Roles.',
    );
    return { seeded: 1, reason: 'BOOTSTRAP_ADMIN' };
  }

  const users = readSeedFile(options.seedFile);
  if (users.length === 0) {
    return { seeded: 0, reason: 'NOTHING' };
  }
  await knex('platform_users').insert(
    users.map(u => ({
      name: u.name,
      display_name: u.displayName ?? u.name,
      member_of: JSON.stringify(u.memberOf),
      created_by: 'system:first-install',
      created_at: now,
    })),
  );
  options.log(
    `Seeded ${users.length} development users from ${path.basename(
      options.seedFile,
    )}. This runs once — a restart will not rewrite role changes.`,
  );
  return { seeded: users.length, reason: 'DEMO_USERS' };
}
