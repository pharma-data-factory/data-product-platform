/**
 * The GitHub team reconciler (NXD-108): brings each configured team in line
 * with the Nexora user records, and records what it did.
 *
 * Two halves, so the rules can be tested without GitHub or a database:
 *
 * - `planTeam` is pure. Given who should be in a team and who is, it says
 *   what to remove, add, keep and leave alone.
 * - `reconcile` reads both sides, applies each team's plan, and writes the
 *   outcome to `github_team_sync_state` and every change to
 *   `user_audit_events`.
 *
 * ## The rules
 *
 * **Removal first.** Within a team every removal runs before any addition, so
 * a run cut short by a failure or a timeout has taken access away rather than
 * handed it out. Offboarding is the half an auditor asks about.
 *
 * **Only managed logins are removed.** A login is managed if Nexora has a user
 * record for it, or if this reconciler synced it into the team before (a
 * `github_team_sync_state` row). The second clause is what makes deletion
 * work: a deleted user has no record, but their state row still says Nexora
 * put them there. Everyone else in the team is `unmanaged` — reported, never
 * touched. A team that also holds people outside Nexora keeps them.
 *
 * **Isolation per team.** A team that cannot be read, or a single call that
 * fails, is recorded and the run moves on. One missing team or one refused
 * invitation never stops offboarding in the others.
 *
 * **Approval roles never cross over.** `teams` maps platform groups only;
 * `parseGithubTeamSyncConfig` refuses `urs-*` before this code can run.
 */

import type {
  GithubTeamsClient,
  GithubTeamsFailure,
  GithubTeamsResult,
} from './githubTeams';
import type {
  PlatformUserRecord,
  TeamSyncStateRecord,
  UsersRepository,
} from './repository';

/** Recorded as the actor on every change the reconciler makes. */
export const TEAM_SYNC_ACTOR = 'system:github-team-sync';

export interface TeamPlan {
  team: string;
  /** Managed logins present in the team that should not be. */
  remove: string[];
  /** Logins that should be in the team and are neither members nor invited. */
  add: string[];
  /** Should be in the team and are members. */
  keepActive: string[];
  /** Should be in the team and have an open invitation. */
  keepInvited: string[];
  /** Present in the team, not managed by Nexora. Left alone. */
  unmanaged: string[];
  /** State rows for logins that are neither wanted nor present; dropped. */
  forget: string[];
}

const sorted = (values: Iterable<string>) => [...new Set(values)].sort();

/** Pure. Every input is a set of lowercase GitHub logins. */
export function planTeam(input: {
  team: string;
  desired: ReadonlySet<string>;
  members: readonly string[];
  invitations: readonly string[];
  /** Logins with a Nexora user record. */
  known: ReadonlySet<string>;
  /** Logins with a state row for this team. */
  previouslySynced: ReadonlySet<string>;
}): TeamPlan {
  const members = new Set(input.members);
  const invitations = new Set(input.invitations);
  const present = new Set([...members, ...invitations]);
  const managed = (login: string) =>
    input.known.has(login) || input.previouslySynced.has(login);

  return {
    team: input.team,
    remove: sorted(
      [...present].filter(l => managed(l) && !input.desired.has(l)),
    ),
    add: sorted([...input.desired].filter(l => !present.has(l))),
    keepActive: sorted([...input.desired].filter(l => members.has(l))),
    keepInvited: sorted(
      [...input.desired].filter(l => !members.has(l) && invitations.has(l)),
    ),
    unmanaged: sorted([...present].filter(l => !managed(l))),
    forget: sorted(
      [...input.previouslySynced].filter(
        l => !input.desired.has(l) && !present.has(l),
      ),
    ),
  };
}

/**
 * Team slug → logins that should be in it. Several groups may map to one
 * team; holding any of them is enough.
 */
export function desiredByTeam(
  users: readonly Pick<PlatformUserRecord, 'name' | 'memberOf'>[],
  teams: Readonly<Record<string, string>>,
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const team of Object.values(teams)) {
    result.set(team, new Set());
  }
  for (const user of users) {
    for (const group of user.memberOf) {
      const team = teams[group];
      if (team) {
        result.get(team)!.add(user.name.toLowerCase());
      }
    }
  }
  return result;
}

export interface TeamOutcome {
  team: string;
  /** False when the team could not be read; nothing was changed in it. */
  ok: boolean;
  reason?: GithubTeamsFailure;
  message?: string;
  added: string[];
  invited: string[];
  removed: string[];
  unmanaged: string[];
  failed: Array<{ user: string; reason: GithubTeamsFailure; message?: string }>;
}

export interface ReconcileSummary {
  organization: string;
  startedAt: string;
  finishedAt: string;
  teams: TeamOutcome[];
}

async function readTeam(
  client: GithubTeamsClient,
  team: string,
): Promise<GithubTeamsResult<{ members: string[]; invitations: string[] }>> {
  const members = await client.listMembers(team);
  if (!members.ok) {
    return members;
  }
  const invitations = await client.listInvitations(team);
  if (!invitations.ok) {
    return invitations;
  }
  return {
    ok: true,
    value: { members: members.value, invitations: invitations.value },
  };
}

function describe(reason: GithubTeamsFailure, message?: string): string {
  return message ? `${reason}: ${message}` : reason;
}

export async function reconcile(options: {
  organization: string;
  teams: Readonly<Record<string, string>>;
  client: GithubTeamsClient;
  repository: UsersRepository;
  log: (message: string) => void;
}): Promise<ReconcileSummary> {
  const { client, repository, organization } = options;
  const startedAt = new Date().toISOString();

  const users = await repository.listUsers();
  const known = new Set(users.map(u => u.name.toLowerCase()));
  const desired = desiredByTeam(users, options.teams);
  const state = await repository.listTeamSyncState();
  const syncedInto = (team: string) =>
    new Set(
      state
        .filter((row: TeamSyncStateRecord) => row.teamSlug === team)
        .map(row => row.userId),
    );

  const outcomes: TeamOutcome[] = [];
  for (const [team, wanted] of desired) {
    const outcome: TeamOutcome = {
      team,
      ok: true,
      added: [],
      invited: [],
      removed: [],
      unmanaged: [],
      failed: [],
    };
    outcomes.push(outcome);

    const read = await readTeam(client, team);
    if (!read.ok) {
      outcome.ok = false;
      outcome.reason = read.reason;
      outcome.message = read.message;
      // What the reconciler last saw for these people is "could not check".
      for (const login of wanted) {
        await repository.upsertTeamSyncState({
          userId: login,
          teamSlug: team,
          status: 'error',
          lastError: describe(read.reason, read.message),
        });
      }
      options.log(
        `GitHub team sync: ${organization}/${team} skipped — ${describe(
          read.reason,
          read.message,
        )}`,
      );
      continue;
    }

    const plan = planTeam({
      team,
      desired: wanted,
      members: read.value.members,
      invitations: read.value.invitations,
      known,
      previouslySynced: syncedInto(team),
    });
    outcome.unmanaged = plan.unmanaged;

    // Removal first: a run that stops part-way has taken access away, not
    // handed it out.
    for (const login of plan.remove) {
      const result = await client.removeMember(team, login);
      if (result.ok || result.reason === 'not-found') {
        await repository.deleteTeamSyncState(login, team);
        if (result.ok) {
          outcome.removed.push(login);
          await repository.appendAudit({
            actor: TEAM_SYNC_ACTOR,
            action: 'GITHUB_TEAM_REMOVED',
            entity: login,
            oldValue: { organization, team },
          });
        }
        continue;
      }
      outcome.failed.push({
        user: login,
        reason: result.reason,
        message: result.message,
      });
      await repository.upsertTeamSyncState({
        userId: login,
        teamSlug: team,
        status: 'error',
        lastError: `removal failed — ${describe(
          result.reason,
          result.message,
        )}`,
      });
    }

    for (const login of plan.add) {
      const result = await client.addMember(team, login);
      if (result.ok) {
        const status = result.value === 'pending' ? 'invited' : 'active';
        (status === 'invited' ? outcome.invited : outcome.added).push(login);
        await repository.upsertTeamSyncState({
          userId: login,
          teamSlug: team,
          status,
        });
        await repository.appendAudit({
          actor: TEAM_SYNC_ACTOR,
          action: 'GITHUB_TEAM_ADDED',
          entity: login,
          newValue: { organization, team, state: result.value },
        });
        continue;
      }
      outcome.failed.push({
        user: login,
        reason: result.reason,
        message: result.message,
      });
      await repository.upsertTeamSyncState({
        userId: login,
        teamSlug: team,
        status: result.reason === 'not-in-org' ? 'not_in_org' : 'error',
        lastError: describe(result.reason, result.message),
      });
    }

    for (const login of plan.keepActive) {
      await repository.upsertTeamSyncState({
        userId: login,
        teamSlug: team,
        status: 'active',
      });
    }
    for (const login of plan.keepInvited) {
      await repository.upsertTeamSyncState({
        userId: login,
        teamSlug: team,
        status: 'invited',
      });
    }
    for (const login of plan.forget) {
      await repository.deleteTeamSyncState(login, team);
    }
  }

  const summary: ReconcileSummary = {
    organization,
    startedAt,
    finishedAt: new Date().toISOString(),
    teams: outcomes,
  };
  const changes = outcomes.reduce(
    (n, o) => n + o.added.length + o.invited.length + o.removed.length,
    0,
  );
  const failures = outcomes.filter(o => !o.ok || o.failed.length > 0).length;
  options.log(
    `GitHub team sync: ${outcomes.length} team(s), ${changes} change(s), ` +
      `${failures} team(s) with failures.`,
  );
  return summary;
}
