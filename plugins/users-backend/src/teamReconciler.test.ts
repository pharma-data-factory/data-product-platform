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
/** An organization everyone in these plans belongs to. */
const EVERYONE = {
  has: () => true,
} as unknown as ReadonlySet<string>;

describe('planTeam', () => {
  it('adds the missing, removes the unwanted, keeps the rest', () => {
    const plan = planTeam({
      team: 'nexora-developers',
      desired: set('ann', 'ben', 'cat'),
      members: ['ann', 'dan'],
      invitations: ['ben'],
      known: set('ann', 'ben', 'cat', 'dan'),
      previouslySynced: set(),
      orgMembers: EVERYONE,
    });
    expect(plan).toEqual({
      team: 'nexora-developers',
      remove: ['dan'],
      add: ['cat'],
      notInOrg: [],
      unverified: [],
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
      orgMembers: EVERYONE,
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
      orgMembers: EVERYONE,
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
      orgMembers: EVERYONE,
    });
    expect(plan.remove).toEqual(['demoted']);
  });

  it('adds only organization members; the rest are not invited (NXD-116)', () => {
    const plan = planTeam({
      team: 't',
      desired: set('staff', 'admin', 'demo-pm'),
      members: [],
      invitations: [],
      known: set('staff', 'admin', 'demo-pm'),
      previouslySynced: set(),
      orgMembers: set('staff'),
    });
    expect(plan.add).toEqual(['staff']);
    expect(plan.notInOrg).toEqual(['admin', 'demo-pm']);
  });

  it('adds no one when the organization members are unknown, and still removes', () => {
    const plan = planTeam({
      team: 't',
      desired: set('staff'),
      members: ['demoted'],
      invitations: [],
      known: set('staff', 'demoted'),
      previouslySynced: set(),
      orgMembers: null,
    });
    expect(plan.add).toEqual([]);
    expect(plan.unverified).toEqual(['staff']);
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
      orgMembers: EVERYONE,
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
        'data-product-developers': ['nexora-builders'],
        'data-product-owners': ['nexora-builders'],
        'platform-admins': ['nexora-admins'],
      },
    );
    expect([...desired.get('nexora-builders')!].sort()).toEqual(['ann', 'ben']);
    expect([...desired.get('nexora-admins')!]).toEqual([]);
  });

  it('puts a group mapped to several teams in each of them (NXD-112)', () => {
    const desired = desiredByTeam(
      [
        { name: 'boss', memberOf: ['platform-admins'] },
        { name: 'dev', memberOf: ['data-product-developers'] },
      ],
      {
        'data-product-developers': ['nexora-developers'],
        'platform-admins': ['nexora-admins', 'nexora-developers'],
      },
    );
    expect([...desired.get('nexora-admins')!]).toEqual(['boss']);
    expect([...desired.get('nexora-developers')!].sort()).toEqual([
      'boss',
      'dev',
    ]);
  });
});

/**
 * In-memory GitHub: teams → members / invitations, with scripted failures.
 * Organization members come from `defaultOrgMembers` until a test sets them.
 */
function fakeGithub(
  teams: Record<string, { members: string[]; invitations?: string[] }>,
  defaultOrgMembers: () => Promise<string[]> = async () => [],
) {
  const calls: string[] = [];
  const failures = new Map<string, GithubTeamsResult<never>>();
  const pendingFor = new Set<string>();
  let orgMembers: string[] | null = null;
  let orgFailure: GithubTeamsResult<never> | null = null;
  const client: GithubTeamsClient = {
    async listOrgMembers() {
      calls.push('list-org');
      if (orgFailure) return orgFailure;
      return { ok: true, value: orgMembers ?? (await defaultOrgMembers()) };
    },
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
  return {
    client,
    calls,
    failures,
    pendingFor,
    teams,
    setOrgMembers: (logins: string[]) => {
      orgMembers = logins;
    },
    failOrg: (failure: GithubTeamsResult<never>) => {
      orgFailure = failure;
    },
  };
}

describe('reconcile', () => {
  let db: Knex;
  let repository: UsersRepository;
  const log = jest.fn();

  const MAPPING = {
    'data-product-developers': ['nexora-developers'],
    'platform-admins': ['nexora-admins'],
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

  /** Every Nexora user is an organization member unless a test says otherwise. */
  const withOrg = (teams: Parameters<typeof fakeGithub>[0]) =>
    fakeGithub(teams, async () =>
      (await repository.listUsers()).map(u => u.name.toLowerCase()),
    );

  const run = (client: GithubTeamsClient, dryRun = false) =>
    reconcile({
      organization: 'pharma-data-factory',
      teams: MAPPING,
      client,
      repository,
      log,
      dryRun,
    });

  it('removes before it adds, within a team', async () => {
    await addUser('newdev', ['data-product-developers']);
    await addUser('demoted', ['platform-viewers']);
    const github = withOrg({
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
    const github = withOrg({
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
    const github = withOrg({
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
    const github = withOrg({
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
    const github = withOrg({
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
    const github = withOrg({
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
    const github = withOrg({
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

  it('never invites the seed and demo logins, which are strangers on GitHub (NXD-116)', async () => {
    await addUser('schmeckm', ['platform-admins']);
    await addUser('admin', ['platform-admins']);
    await addUser('developer', ['data-product-developers']);
    await addUser('demo-pm', ['data-product-developers']);
    const github = withOrg({
      'nexora-developers': { members: [] },
      'nexora-admins': { members: [] },
    });
    github.setOrgMembers(['schmeckm']);

    const summary = await run(github.client);

    expect(github.calls.filter(c => c.startsWith('add'))).toEqual([
      'add nexora-admins schmeckm',
    ]);
    expect(summary.teams.map(t => [t.team, t.notInOrg])).toEqual([
      ['nexora-developers', ['demo-pm', 'developer']],
      ['nexora-admins', ['admin']],
    ]);
    const state = await repository.listTeamSyncState();
    expect(state.find(s => s.userId === 'admin')).toMatchObject({
      status: 'not_in_org',
      lastError: expect.stringContaining('invite them to the organization'),
    });
    expect(
      (await repository.listAudit()).filter(a => a.actor === TEAM_SYNC_ACTOR),
    ).toHaveLength(1);
  });

  it('adds no one when the organization cannot be read, and still removes', async () => {
    await addUser('newdev', ['data-product-developers']);
    await addUser('demoted', ['platform-viewers']);
    const github = withOrg({
      'nexora-developers': { members: ['demoted'] },
      'nexora-admins': { members: [] },
    });
    github.failOrg({ ok: false, reason: 'forbidden', status: 403 });

    const summary = await run(github.client);

    expect(github.calls.filter(c => /^(add|remove)/.test(c))).toEqual([
      'remove nexora-developers demoted',
    ]);
    expect(summary.orgMembersError).toBe('forbidden');
    expect(
      (await repository.listTeamSyncState()).find(s => s.userId === 'newdev'),
    ).toMatchObject({
      status: 'error',
      lastError: expect.stringContaining(
        'organization members could not be read',
      ),
    });
  });

  it('reports the plan on a dry run and writes nothing anywhere (NXD-116)', async () => {
    await addUser('newdev', ['data-product-developers']);
    await addUser('demoted', ['platform-viewers']);
    await addUser('admin', ['platform-admins']);
    const github = withOrg({
      'nexora-developers': { members: ['demoted'] },
      'nexora-admins': { members: [] },
    });
    github.setOrgMembers(['newdev', 'demoted']);

    const summary = await run(github.client, true);

    expect(summary.dryRun).toBe(true);
    expect(github.calls.filter(c => /^(add|remove)/.test(c))).toEqual([]);
    expect(summary.teams.map(t => [t.team, t.planned, t.notInOrg])).toEqual([
      ['nexora-developers', { add: ['newdev'], remove: ['demoted'] }, []],
      ['nexora-admins', { add: [], remove: [] }, ['admin']],
    ]);
    expect(await repository.listTeamSyncState()).toEqual([]);
    expect(
      (await repository.listAudit()).filter(a => a.actor === TEAM_SYNC_ACTOR),
    ).toEqual([]);
  });

  it('keeps the state row when a removal fails, so the next run retries', async () => {
    await addUser('leaver', ['data-product-developers']);
    const github = withOrg({
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
