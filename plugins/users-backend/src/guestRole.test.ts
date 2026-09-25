/**
 * The local Guest elevation: what it grants, what it refuses, and what it
 * leaves alone.
 *
 * The behaviour under test replaces a config file that claimed to do this and
 * did nothing — `auth.providers.guest.ownershipEntityRefs` is read by the
 * upstream resolver only when the catalog lookup fails, and for Guest it never
 * does. These tests assert against the store the Catalog projection is written
 * from, which is where ownership actually comes from.
 */

import knex, { Knex } from 'knex';

import { UsersRepository } from './repository';
import {
  GUEST_ROLE_ACTOR,
  GUEST_USER_NAME,
  applyGuestGroups,
} from './guestRole';

const DEVELOPER_GROUPS = ['guests', 'data-product-developers', 'urs-authors'];

describe('applyGuestGroups', () => {
  let db: Knex;
  let repository: UsersRepository;
  const log = jest.fn();
  const warn = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.raw('select 1');
    repository = await UsersRepository.create({ getClient: () => db });
  });

  afterEach(async () => {
    await db.destroy();
  });

  /** The guest row a first install leaves behind. */
  async function seedViewerGuest() {
    await repository.createUser({
      name: GUEST_USER_NAME,
      displayName: 'Guest',
      memberOf: ['guests', 'platform-viewers'],
      actor: 'system:first-install',
    });
  }

  it('does nothing when no groups are configured', async () => {
    await seedViewerGuest();

    const result = await applyGuestGroups({
      environment: 'development',
      groups: undefined,
      repository,
      log,
      warn,
    });

    expect(result).toBe('NOT_CONFIGURED');
    expect((await repository.getUser(GUEST_USER_NAME))?.memberOf).toEqual([
      'guests',
      'platform-viewers',
    ]);
    expect(await repository.listAudit()).toHaveLength(0);
  });

  it('refuses in production and leaves the row untouched', async () => {
    await seedViewerGuest();

    const result = await applyGuestGroups({
      environment: 'production',
      groups: DEVELOPER_GROUPS,
      repository,
      log,
      warn,
    });

    expect(result).toBe('REFUSED_IN_PRODUCTION');
    expect((await repository.getUser(GUEST_USER_NAME))?.memberOf).toEqual([
      'guests',
      'platform-viewers',
    ]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('auth.environment is production'),
    );
  });

  it('raises the seeded viewer guest to the configured groups', async () => {
    await seedViewerGuest();

    const result = await applyGuestGroups({
      environment: 'development',
      groups: DEVELOPER_GROUPS,
      repository,
      log,
      warn,
    });

    expect(result).toBe('APPLIED');
    expect((await repository.getUser(GUEST_USER_NAME))?.memberOf).toEqual(
      DEVELOPER_GROUPS,
    );
  });

  it('records who granted the role', async () => {
    await seedViewerGuest();

    await applyGuestGroups({
      environment: 'development',
      groups: DEVELOPER_GROUPS,
      repository,
      log,
      warn,
    });

    const [entry] = await repository.listAudit();
    expect(entry).toMatchObject({
      actor: GUEST_ROLE_ACTOR,
      action: 'UPDATED',
      entity: 'user:default/guest',
      oldValue: { memberOf: ['guests', 'platform-viewers'] },
      newValue: { memberOf: DEVELOPER_GROUPS },
    });
  });

  it('writes nothing on a restart that changes nothing', async () => {
    await seedViewerGuest();
    await applyGuestGroups({
      environment: 'development',
      groups: DEVELOPER_GROUPS,
      repository,
      log,
      warn,
    });

    // Same groups, different order — a restart must not read as a change.
    const second = await applyGuestGroups({
      environment: 'development',
      groups: [...DEVELOPER_GROUPS].reverse(),
      repository,
      log,
      warn,
    });

    expect(second).toBe('UNCHANGED');
    expect(await repository.listAudit()).toHaveLength(1);
  });

  it('creates the guest row when the seed never made one', async () => {
    const result = await applyGuestGroups({
      environment: 'development',
      groups: DEVELOPER_GROUPS,
      repository,
      log,
      warn,
    });

    expect(result).toBe('APPLIED');
    expect((await repository.getUser(GUEST_USER_NAME))?.memberOf).toEqual(
      DEVELOPER_GROUPS,
    );
    expect((await repository.listAudit())[0]).toMatchObject({
      action: 'CREATED',
      actor: GUEST_ROLE_ACTOR,
    });
  });
});
