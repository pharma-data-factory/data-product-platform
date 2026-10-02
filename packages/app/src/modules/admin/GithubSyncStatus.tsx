/**
 * GitHub team sync status on Admin → Users & Roles (NXD-108).
 *
 * Rendered only when the backend reports the sync as enabled. The chips show
 * what the reconciler last saw per team; the banner shows the last run on the
 * backend instance that answered, and lets an administrator start one now.
 * Nothing here changes a role — roles are changed above, and the reconciler
 * follows them.
 */

import { Button, Chip, Tooltip, Typography } from '@material-ui/core';
import { NEXORA_GREY, NEXORA_TONE } from '@internal/plugin-nexora-common';

export type GithubSyncState = 'active' | 'invited' | 'not_in_org' | 'error';

export interface GithubSyncStateRow {
  userId: string;
  teamSlug: string;
  status: GithubSyncState;
  lastChecked: string;
  lastError?: string;
}

export interface GithubSyncTeamOutcome {
  team: string;
  ok: boolean;
  reason?: string;
  message?: string;
  added: string[];
  invited: string[];
  removed: string[];
  unmanaged: string[];
  failed: Array<{ user: string; reason: string; message?: string }>;
}

export interface GithubSyncStatusResponse {
  enabled: boolean;
  organization?: string;
  teams?: Record<string, string[]>;
  lastRun?: {
    startedAt: string;
    finishedAt: string;
    teams: GithubSyncTeamOutcome[];
  } | null;
  states?: GithubSyncStateRow[];
}

const STATE_APPEARANCE: Record<
  GithubSyncState,
  { label: string; backgroundColor: string; color: string }
> = {
  active: {
    label: 'active',
    backgroundColor: NEXORA_TONE.success.bg,
    color: NEXORA_TONE.success.fg,
  },
  invited: {
    label: 'invited',
    backgroundColor: NEXORA_TONE.info.bg,
    color: NEXORA_TONE.info.fg,
  },
  not_in_org: {
    label: 'not in org',
    backgroundColor: NEXORA_TONE.warning.bg,
    color: NEXORA_TONE.warning.fg,
  },
  error: {
    label: 'error',
    backgroundColor: NEXORA_TONE.danger.bg,
    color: NEXORA_TONE.danger.fg,
  },
};

/** The state rows for one login, in team order. */
export function syncRowsFor(
  status: GithubSyncStatusResponse | null,
  login: string,
): GithubSyncStateRow[] {
  return (status?.states ?? []).filter(
    row => row.userId === login.toLowerCase(),
  );
}

/** Teams in the last run that could not be read or had a refused call. */
export function teamsWithFailures(status: GithubSyncStatusResponse | null) {
  return (status?.lastRun?.teams ?? []).filter(
    team => !team.ok || team.failed.length > 0,
  );
}

export function GithubSyncChips(props: { rows: GithubSyncStateRow[] }) {
  if (props.rows.length === 0) {
    return (
      <Typography variant="caption" color="textSecondary">
        GitHub: no team
      </Typography>
    );
  }
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      {props.rows.map(row => {
        const appearance = STATE_APPEARANCE[row.status];
        const title = [
          `Last checked ${new Date(row.lastChecked).toLocaleString()}`,
          row.lastError,
        ]
          .filter(Boolean)
          .join(' — ');
        return (
          <Tooltip key={row.teamSlug} title={title}>
            <Chip
              size="small"
              label={`${row.teamSlug}: ${appearance.label}`}
              style={{
                backgroundColor: appearance.backgroundColor,
                color: appearance.color,
                fontWeight: 600,
              }}
            />
          </Tooltip>
        );
      })}
    </span>
  );
}

export function GithubSyncBanner(props: {
  status: GithubSyncStatusResponse;
  running: boolean;
  onRun: () => void;
}) {
  const { status, running, onRun } = props;
  const failures = teamsWithFailures(status);
  const lastRun = status.lastRun;
  return (
    <section
      aria-label="GitHub team sync"
      style={{
        border: `1px solid ${NEXORA_GREY[200]}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <Typography variant="subtitle1">
          GitHub team sync — {status.organization}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {lastRun
            ? `Last run ${new Date(lastRun.finishedAt).toLocaleString()}.`
            : 'No run recorded on this backend instance yet.'}{' '}
          Team membership follows the platform role; URS approval roles are
          never synced.
        </Typography>
        {failures.length > 0 ? (
          <Typography
            variant="body2"
            style={{ color: NEXORA_TONE.danger.text, marginTop: 4 }}
          >
            {failures.length} team(s) with failures:{' '}
            {failures
              .map(team =>
                team.ok
                  ? `${team.team} (${team.failed.length} refused)`
                  : `${team.team} (${team.reason})`,
              )
              .join(', ')}
          </Typography>
        ) : null}
      </div>
      <Button variant="outlined" disabled={running} onClick={onRun}>
        {running ? 'Starting…' : 'Sync now'}
      </Button>
    </section>
  );
}
