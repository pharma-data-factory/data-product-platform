/**
 * The GitHub team reconciler (NXD-108). The pure plan first, then a full run
 * against a fake GitHub and the real repository on SQLite — the properties
 * that matter are removal before addition, isolation per team, unmanaged
 * members left alone, and an audit entry for every change.
 */

import knex, { Knex } from 'knex';
import type { GithubTeamsClient, GithubTeamsResult } from './githubTeams';
import { UsersRepository } from './repository';
import {
  desiredByTeam,
  planTeam,
  reconcile,
  TEAM_SYNC_ACTOR,
} from './teamReconciler';

const set = (...values: string[]) => new Set(values);

describe('planTeam', () => {
  it('adds the missing, removes the unwanted, keeps the rest', () => {
    const plan = planTeam({
      team: 'nexora-developers',
      desired: set('ann', 'ben', 'cat'),
      members: ['ann', 'dan'],
      invitations: ['ben'],
      known: set('ann', 'ben', 'cat', 'dan'),
      previouslySynced: set(),
    });
    expect(plan).toEqual({
      team: 'nexora-developers',
      remove: ['dan'],
      add: ['cat'],
      keepActive: ['ann'],
      keepInvited: ['ben'],
      unmanaged: [],
      forget: [],
    });
  });

  it('leaves members Nexora does not know alone', () => {
    const plan = planTeam({
      team: 't',
      desired: set('ann'),
      members: ['ann', 'contractor'],
      invitations: ['external-invitee'],
      known: set('ann'),
      previouslySynced: set(),
    });
    expect(plan.remove).toEqual([]);
    expect(plan.unmanaged).toEqual(['contractor', 'external-invitee']);
  });

  it('removes a deleted user it synced before, though Nexora no longer knows them', () => {
    // The offboarding case: no user record, but the state row says Nexora
    // put them in this team.
    const plan = planTeam({
      team: 't',
      desired: set(),
      members: ['leaver'],
      invitations: [],
      known: set(),
      previouslySynced: set('leaver'),
    });
    expect(plan.remove).toEqual(['leaver']);
    expect(plan.unmanaged).toEqual([]);
  });

  it('withdraws an open invitation that is no longer wanted', () => {
    const plan = planTeam({
      team: 't',
      desired: set(),
      members: [],
      invitations: ['demoted'],
      known: set('demoted'),
      previouslySynced: set('demoted'),
    });
    expect(plan.remove).toEqual(['demoted']);
  });

  it('forgets state rows for people neither wanted nor present', () => {
    const plan = planTeam({
      team: 't',
      desired: set(),
      members: [],
      invitations: [],
      known: set('gone'),
      previouslySynced: set('gone'),
    });
    expect(plan.forget).toEqual(['gone']);
    expect(plan.remove).toEqual([]);
  });
});

describe('desiredByTeam', () => {
  it('maps groups to teams, several groups to one team, and ignores urs-*', () => {
    const desired = desiredByTeam(
      [
        { name: 'Ann', memberOf: ['data-product-developers'] },
        { name: 'ben', memberOf: ['data-product-owners', 'urs-authors'] },
        { name: 'cat', memberOf: ['platform-viewers'] },
      ],
      {
        'data-product-developers': 'nexora-builders',
        'data-product-owners': 'nexora-builders',
        'platform-admins': 'nexora-admins',
      },
    );
    expect([...desired.get('nexora-builders')!].sort()).toEqual(['ann', 'ben']);
    expect([...desired.get('nexora-admins')!]).toEqual([]);
  });
});

/** In-memory GitHub: teams → members / invitations, with scripted failures. */
function fakeGithub(
  teams: Record<string, { members: string[]; invitations?: string[] }>,
) {
  const calls: string[] = [];
  const failures = new Map<string, GithubTeamsResult<never>>();
  const pendingFor = new Set<string>();
  const client: GithubTeamsClient = {
    async listMembers(team) {
      calls.push(`list ${team}`);
      const fail = failures.get(`list ${team}`);
      if (fail) return fail;
      return { ok: true, value: [...(teams[team]?.members ?? [])] };
    },
    async listInvitations(team) {
      return { ok: true, value: [...(teams[team]?.invitations ?? [])] };
    },
    async addMember(team, user) {
      calls.push(`add ${team} ${user}`);
      const fail = failures.get(`add ${team} ${user}`);
      if (fail) return fail;
      if (pendingFor.has(user)) {
        teams[team].invitations = [...(teams[team].invitations ?? []), user];
        return { ok: true, value: 'pending' };
      }
      teams[team].members.push(user);
      return { ok: true, value: 'active' };
    },
    async removeMember(team, user) {
      calls.push(`remove ${team} ${user}`);
      const fail = failures.get(`remove ${team} ${user}`);
      if (fail) return fail;
      teams[team].members = teams[team].members.filter(m => m !== user);
      return { ok: true, value: undefined };
    },
  };
  return { client, calls, failures, pendingFor, teams };
}

describe('reconcile', () => {
  let db: Knex;
  let repository: UsersRepository;
  const log = jest.fn();

  const MAPPING = {
    'data-product-developers': 'nexora-developers',
    'platform-admins': 'nexora-admins',
  };

  async function addUser(name: string, memberOf: string[]) {
    await repository.createUser({
      name,
      displayName: name,
      memberOf,
      actor: 'user:default/admin',
    });
  }

  beforeEach(async () => {
    jest.clearAllMocks();
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

  const run = (client: GithubTeamsClient) =>
    reconcile({
      organization: 'pharma-data-factory',
      teams: MAPPING,
      client,
      repository,
      log,
    });

  it('removes before it adds, within a team', async () => {
    await addUser('newdev', ['data-product-developers']);
    await addUser('demoted', ['platform-viewers']);
    const github = fakeGithub({
      'nexora-developers': { members: ['demoted'] },
      'nexora-admins': { members: [] },
    });

    await run(github.client);

    const devCalls = github.calls.filter(c => c.includes('nexora-developers'));
    expect(devCalls).toEqual([
      'list nexora-developers',
      'remove nexora-developers demoted',
      'add nexora-developers newdev',
    ]);
  });

  it('records every change in the audit trail under the reconciler actor', async () => {
    await addUser('newdev', ['data-product-developers']);
    await addUser('demoted', ['platform-viewers']);
    const github = fakeGithub({
      'nexora-developers': { members: ['demoted'] },
      'nexora-admins': { members: [] },
    });

    await run(github.client);

    const audit = (await repository.listAudit()).filter(
      a => a.actor === TEAM_SYNC_ACTOR,
    );
    expect(
      audit.map(a => [a.action, a.entity, a.oldValue ?? a.newValue]),
    ).toEqual(
      expect.arrayContaining([
        [
          'GITHUB_TEAM_REMOVED',
          'demoted',
          { organization: 'pharma-data-factory', team: 'nexora-developers' },
        ],
        [
          'GITHUB_TEAM_ADDED',
          'newdev',
          {
            organization: 'pharma-data-factory',
            team: 'nexora-developers',
            state: 'active',
          },
        ],
      ]),
    );
    expect(audit).toHaveLength(2);
  });

  it('writes the state it saw: active, invited, not in org', async () => {
    await addUser('member', ['data-product-developers']);
    await addUser('invitee', ['data-product-developers']);
    await addUser('outsider', ['data-product-developers']);
    const github = fakeGithub({
      'nexora-developers': { members: ['member'] },
      'nexora-admins': { members: [] },
    });
    github.pendingFor.add('invitee');
    github.failures.set('add nexora-developers outsider', {
      ok: false,
      reason: 'not-in-org',
      status: 422,
      message: 'Validation Failed',
    });

    const summary = await run(github.client);

    const state = await repository.listTeamSyncState();
    expect(
      state.map(s => [s.userId, s.teamSlug, s.status, s.lastError]),
    ).toEqual([
      ['invitee', 'nexora-developers', 'invited', undefined],
      ['member', 'nexora-developers', 'active', undefined],
      [
        'outsider',
        'nexora-developers',
        'not_in_org',
        'not-in-org: Validation Failed',
      ],
    ]);
    const dev = summary.teams.find(t => t.team === 'nexora-developers')!;
    expect(dev.invited).toEqual(['invitee']);
    expect(dev.failed).toEqual([
      { user: 'outsider', reason: 'not-in-org', message: 'Validation Failed' },
    ]);
  });

  it('isolates a team that cannot be read and goes on with the others', async () => {
    await addUser('dev', ['data-product-developers']);
    await addUser('boss', ['platform-admins']);
    const github = fakeGithub({
      'nexora-developers': { members: [] },
      'nexora-admins': { members: [] },
    });
    github.failures.set('list nexora-developers', {
      ok: false,
      reason: 'not-found',
      status: 404,
      message: 'Not Found',
    });

    const summary = await run(github.client);

    expect(
      summary.teams.find(t => t.team === 'nexora-developers'),
    ).toMatchObject({
      ok: false,
      reason: 'not-found',
      added: [],
    });
    expect(summary.teams.find(t => t.team === 'nexora-admins')).toMatchObject({
      ok: true,
      added: ['boss'],
    });
    const state = await repository.listTeamSyncState();
    expect(state.find(s => s.userId === 'dev')).toMatchObject({
      status: 'error',
      lastError: 'not-found: Not Found',
    });
  });

  it('carries on after a single refused call', async () => {
    await addUser('a-refused', ['data-product-developers']);
    await addUser('b-fine', ['data-product-developers']);
    const github = fakeGithub({
      'nexora-developers': { members: [] },
      'nexora-admins': { members: [] },
    });
    github.failures.set('add nexora-developers a-refused', {
      ok: false,
      reason: 'forbidden',
      status: 403,
    });

    const summary = await run(github.client);

    expect(github.teams['nexora-developers'].members).toEqual(['b-fine']);
    expect(summary.teams[0].failed).toEqual([
      { user: 'a-refused', reason: 'forbidden', message: undefined },
    ]);
  });

  it('never touches members Nexora does not manage', async () => {
    await addUser('dev', ['data-product-developers']);
    const github = fakeGithub({
      'nexora-developers': { members: ['dev', 'contractor'] },
      'nexora-admins': { members: ['org-owner'] },
    });

    const summary = await run(github.client);

    expect(github.calls.filter(c => c.startsWith('remove'))).toEqual([]);
    expect(github.teams['nexora-developers'].members).toContain('contractor');
    expect(summary.teams.map(t => t.unmanaged)).toEqual([
      ['contractor'],
      ['org-owner'],
    ]);
  });

  it('takes a deleted user out of the team on the next run', async () => {
    await addUser('leaver', ['data-product-developers']);
    const github = fakeGithub({
      'nexora-developers': { members: [] },
      'nexora-admins': { members: [] },
    });
    await run(github.client);
    expect(github.teams['nexora-developers'].members).toEqual(['leaver']);

    await repository.deleteUser('leaver');
    await run(github.client);

    expect(github.teams['nexora-developers'].members).toEqual([]);
    expect(await repository.listTeamSyncState()).toEqual([]);
  });

  it('keeps the state row when a removal fails, so the next run retries', async () => {
    await addUser('leaver', ['data-product-developers']);
    const github = fakeGithub({
      'nexora-developers': { members: [] },
      'nexora-admins': { members: [] },
    });
    await run(github.client);
    await repository.deleteUser('leaver');
    github.failures.set('remove nexora-developers leaver', {
      ok: false,
      reason: 'unavailable',
      status: 502,
    });

    await run(github.client);

    expect(await repository.listTeamSyncState()).toEqual([
      expect.objectContaining({
        userId: 'leaver',
        status: 'error',
        lastError: 'removal failed — unavailable',
      }),
    ]);
  });
});
