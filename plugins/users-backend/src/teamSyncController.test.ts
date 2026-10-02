/**
 * Scheduling of the GitHub team reconciler (NXD-108): one global task, an
 * immediate trigger through the same lock, and a change made mid-run is not
 * left waiting for the next interval.
 */

import knex, { Knex } from 'knex';
import type { GithubTeamsClient } from './githubTeams';
import { UsersRepository } from './repository';
import { startTeamSync, TEAM_SYNC_TASK_ID } from './teamSyncController';

const emptyGithub: GithubTeamsClient = {
  listMembers: async () => ({ ok: true, value: [] }),
  listInvitations: async () => ({ ok: true, value: [] }),
  addMember: async () => ({ ok: true, value: 'active' }),
  removeMember: async () => ({ ok: true, value: undefined }),
};

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn(),
};

const rootConfig = { getOptionalConfig: () => undefined } as never;

function conflict() {
  return Object.assign(new Error('Task is already running'), {
    name: 'ConflictError',
  });
}

describe('startTeamSync', () => {
  let db: Knex;
  let repository: UsersRepository;
  let task: { id: string; scope?: string; fn: () => Promise<void> } | undefined;
  const scheduler = {
    scheduleTask: jest.fn(async (t: any) => {
      task = t;
    }),
    triggerTask: jest.fn(async () => {}),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    task = undefined;
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    repository = await UsersRepository.create({ getClient: () => db });
  });

  afterEach(async () => {
    await db?.destroy();
  });

  const start = () =>
    startTeamSync({
      config: {
        enabled: true,
        organization: 'pharma-data-factory',
        teams: { 'platform-admins': ['nexora-admins'] },
      },
      rootConfig,
      scheduler: scheduler as never,
      client: emptyGithub,
      repository,
      logger: logger as never,
    });

  it('schedules one global task, every 15 minutes by default', async () => {
    await start();
    expect(scheduler.scheduleTask).toHaveBeenCalledTimes(1);
    expect(scheduler.scheduleTask.mock.calls[0][0]).toMatchObject({
      id: TEAM_SYNC_TASK_ID,
      scope: 'global',
      frequency: { minutes: 15 },
      timeout: { minutes: 5 },
    });
  });

  it('triggers the same task immediately', async () => {
    const sync = await start();
    expect(await sync.trigger()).toBe('triggered');
    expect(scheduler.triggerTask).toHaveBeenCalledWith(TEAM_SYNC_TASK_ID);
  });

  it('queues a trigger that arrives mid-run and fires it when the run ends', async () => {
    const sync = await start();
    scheduler.triggerTask.mockRejectedValueOnce(conflict());
    expect(await sync.trigger()).toBe('queued');

    await task!.fn();
    await new Promise(resolve => setImmediate(resolve));

    expect(scheduler.triggerTask).toHaveBeenCalledTimes(2);
  });

  it('reports the last run and the state after a run', async () => {
    await repository.createUser({
      name: 'boss',
      displayName: 'boss',
      memberOf: ['platform-admins'],
      actor: 'user:default/admin',
    });
    const sync = await start();
    expect((await sync.status()).lastRun).toBeNull();

    await task!.fn();
    const status = await sync.status();

    expect(status).toMatchObject({
      enabled: true,
      organization: 'pharma-data-factory',
      teams: { 'platform-admins': ['nexora-admins'] },
    });
    expect(status.lastRun?.teams[0]).toMatchObject({
      team: 'nexora-admins',
      ok: true,
      added: ['boss'],
    });
    expect(status.states).toEqual([
      expect.objectContaining({ userId: 'boss', status: 'active' }),
    ]);
  });

  it('logs a failed run instead of throwing out of the scheduler', async () => {
    await start();
    await db.destroy();
    await expect(task!.fn()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('GitHub team sync failed'),
    );
  });
});
