/**
 * `users.githubTeamSync` — which platform groups Nexora mirrors into which
 * GitHub teams (NXD-108).
 *
 * Read from the raw config value, like `readDemoUsers`, so the rules live in
 * one function that a test can call without a config loader.
 *
 * ## The guardrail
 *
 * Approval roles are granted only in Nexora (NXD-107). A `urs-*` group in the
 * mapping would make a URS signing authority visible — and, under a later
 * "remove unmanaged members" option, enforceable — from GitHub, where any org
 * owner can change it without a reason and without a Nexora audit entry. So
 * the mapping refuses them outright and the backend does not start. Checked
 * whether or not the sync is enabled: a mapping that is wrong while switched
 * off is still wrong the day someone switches it on.
 */

/** Prefix of the URS approval groups (`urs-authors`, `urs-quality-reviewers`, …). */
export const APPROVAL_GROUP_PREFIX = 'urs-';

export interface GithubTeamSyncConfig {
  enabled: boolean;
  /** GitHub organization the teams live in. */
  organization: string;
  /** Passed to the scheduler as given; validated there. */
  schedule?: Record<string, unknown>;
  /** Platform group name → GitHub team slug. */
  teams: Record<string, string>;
}

function fail(message: string): never {
  throw new Error(`Invalid users.githubTeamSync: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * `${GITHUB_TEAM_SYNC_ENABLED:-false}` arrives as a string, so both shapes
 * are accepted. Anything else is an error rather than a guess.
 */
function readEnabled(value: unknown): boolean {
  if (value === undefined || value === false || value === 'false') {
    return false;
  }
  if (value === true || value === 'true') {
    return true;
  }
  return fail(`enabled must be true or false, got ${JSON.stringify(value)}`);
}

/**
 * Returns undefined when the key is absent. Throws on any invalid content,
 * and always on a `urs-*` group in `teams`.
 */
export function parseGithubTeamSyncConfig(
  raw: unknown,
): GithubTeamSyncConfig | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (!isRecord(raw)) {
    return fail('expected an object');
  }

  const teamsRaw = raw.teams ?? {};
  if (!isRecord(teamsRaw)) {
    return fail('teams must map platform group names to GitHub team slugs');
  }

  // First, before any other check can return: this is the one that matters.
  const approvalGroups = Object.keys(teamsRaw).filter(group =>
    group.toLowerCase().startsWith(APPROVAL_GROUP_PREFIX),
  );
  if (approvalGroups.length > 0) {
    return fail(
      `approval groups must not be mirrored into GitHub (NXD-107): ` +
        `${approvalGroups.join(', ')}. URS approval roles are granted only ` +
        `in Admin → Users & Roles. Remove these entries from teams.`,
    );
  }

  const teams: Record<string, string> = {};
  for (const [group, slug] of Object.entries(teamsRaw)) {
    if (typeof slug !== 'string' || slug.trim() === '') {
      return fail(`teams.${group} must be a GitHub team slug`);
    }
    teams[group] = slug.trim();
  }

  const enabled = readEnabled(raw.enabled);

  const organization =
    typeof raw.organization === 'string' ? raw.organization.trim() : '';
  if (enabled && !organization) {
    return fail('organization is required when enabled');
  }
  if (enabled && Object.keys(teams).length === 0) {
    return fail('teams is empty; there is nothing to keep in step');
  }

  if (raw.schedule !== undefined && !isRecord(raw.schedule)) {
    return fail(
      'schedule must be an object, e.g. { frequency: { minutes: 15 } }',
    );
  }

  return {
    enabled,
    organization,
    schedule: raw.schedule as Record<string, unknown> | undefined,
    teams,
  };
}
