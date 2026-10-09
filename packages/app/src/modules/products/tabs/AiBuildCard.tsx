import { useEffect, useState } from 'react';
import { NEXORA_GREY, NEXORA_TONE } from '@internal/plugin-nexora-common';
import {
  Box,
  Button,
  Chip,
  Link,
  MenuItem,
  TextField,
  Typography,
} from '@material-ui/core';
import type { AiBuildAgent, AiBuildAgents, AiBuildAssignment } from '../api';

/**
 * NXD-153. Assign a draft version's bound requirements to the AI build in the
 * product's repository, and follow what became of each assignment. Nexora
 * dispatches and records; a coding agent writes the code in the repository's
 * own workflow, and a person merges the pull request there, or does not.
 * NXD-154: the agent is Claude Code or OpenAI Codex, chosen per assignment
 * when the AI build offers both.
 */

export interface AiBuildActions {
  list(): Promise<AiBuildAssignment[]>;
  /** NXD-154. Without it, or with one agent offered, the backend's default runs. */
  agents?(): Promise<AiBuildAgents>;
  /** `agent` is passed only when the person chose among several. */
  issue(note?: string, agent?: AiBuildAgent): Promise<AiBuildAssignment>;
  refresh(id: string): Promise<AiBuildAssignment>;
  /** Why a new assignment cannot be issued for this version, if it cannot. */
  blockedReason?: string;
}

const STATUS: Record<
  AiBuildAssignment['status'],
  { label: string; tone: keyof typeof NEXORA_TONE }
> = {
  DISPATCHED: { label: 'Dispatched', tone: 'info' },
  NOT_DISPATCHED: { label: 'Not dispatched', tone: 'danger' },
  RUNNING: { label: 'Running', tone: 'info' },
  RUN_FAILED: { label: 'Run failed', tone: 'danger' },
  NO_CHANGE: { label: 'No change proposed', tone: 'warning' },
  PR_OPEN: { label: 'Pull request open', tone: 'warning' },
  MERGED: { label: 'Merged', tone: 'success' },
  CLOSED: { label: 'Closed unmerged', tone: 'neutral' },
};

export const AGENT_LABEL: Record<AiBuildAgent, string> = {
  'claude-code': 'Claude Code',
  codex: 'OpenAI Codex',
};

const DISPATCH_REASON: Record<string, string> = {
  'no-ai-build-workflow':
    'the repository has no .github/workflows/nexora-ai-build.yml on its default branch',
  inaccessible: 'the GitHub App may not dispatch to this repository',
  'not-found': 'the repository was not found',
  unavailable: 'GitHub could not be reached',
};

/** The lines under an assignment; exported for the test. */
export function assignmentLines(a: AiBuildAssignment): string[] {
  const lines = [
    `${a.requirements.map(r => r.requirementRef).join(', ')} · ${
      a.agent ? `${AGENT_LABEL[a.agent] ?? a.agent}, ` : ''
    }${a.modelId} · issued by ${a.issuedBy} at ${a.issuedAt}`,
  ];
  if (a.status === 'NOT_DISPATCHED') {
    lines.push(
      `Not dispatched: ${
        DISPATCH_REASON[a.dispatchReason ?? ''] ?? a.dispatchReason ?? 'unknown'
      }.`,
    );
  }
  if (a.mergeCommitSha)
    lines.push(`Merged as ${a.mergeCommitSha.slice(0, 12)} at ${a.mergedAt}.`);
  if (a.note) lines.push(`Note: ${a.note}`);
  return lines;
}

export function AiBuildCard(props: AiBuildActions) {
  const { list, agents: loadAgents } = props;
  const [items, setItems] = useState<AiBuildAssignment[] | null>(null);
  const [note, setNote] = useState('');
  const [offered, setOffered] = useState<AiBuildAgents['agents']>([]);
  const [agent, setAgent] = useState<AiBuildAgent | ''>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // A loader that throws before it returns a promise is an error shown
    // here, not a crashed tab.
    Promise.resolve()
      .then(list)
      .then(rows => !cancelled && setItems(rows))
      .catch(
        e => !cancelled && setError(e instanceof Error ? e.message : String(e)),
      );
    return () => {
      cancelled = true;
    };
  }, [list]);

  useEffect(() => {
    if (!loadAgents) return undefined;
    let cancelled = false;
    // Not knowing what is offered is no reason to hide the card: the
    // backend's default agent still runs.
    Promise.resolve()
      .then(loadAgents)
      .then(body => {
        if (cancelled) return;
        setOffered(body.agents);
        setAgent(body.defaultAgent ?? body.agents[0]?.agent ?? '');
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [loadAgents]);
  const choosing = offered.length > 1;
  // NXD-156. The backend refuses a second open assignment; say so before
  // the click. It asks GitHub first, so the button stays: a pull request
  // merged since the last refresh does not block.
  const open = items?.find(a =>
    ['DISPATCHED', 'RUNNING', 'PR_OPEN'].includes(a.status),
  );

  const act = async (fn: () => Promise<AiBuildAssignment>) => {
    setBusy(true);
    setError(null);
    try {
      const changed = await fn();
      setItems(rows => [
        changed,
        ...(rows ?? []).filter(r => r.id !== changed.id),
      ]);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-label="AI build"
      style={{
        marginTop: 24,
        paddingTop: 16,
        borderTop: `1px solid ${NEXORA_GREY[200]}`,
      }}
    >
      <Typography variant="subtitle2" gutterBottom>
        AI build
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Assigns this version's bound requirements to a coding agent, Claude Code
        or OpenAI Codex, in the product's repository. It writes code and
        requirement-tagged tests and opens a pull request. Check what it would
        verify on the Tests tab; a person merges it, or does not.
      </Typography>
      {open && !props.blockedReason ? (
        <Typography variant="body2" color="textSecondary" paragraph>
          An assignment is still open ({STATUS[open.status].label.toLowerCase()}
          ). A new one is refused until its run has finished and its pull
          request is merged or closed; use Refresh to update it.
        </Typography>
      ) : null}
      {props.blockedReason ? (
        <Typography variant="body2" color="textSecondary" paragraph>
          {props.blockedReason}
        </Typography>
      ) : (
        <Box
          display="flex"
          alignItems="flex-start"
          style={{ gap: 12, marginBottom: 12 }}
        >
          <TextField
            id="ai-build-note"
            label="Note for the AI (optional)"
            value={note}
            onChange={e => setNote(e.target.value)}
            size="small"
            variant="outlined"
            multiline
            fullWidth
            inputProps={{ maxLength: 2000 }}
          />
          {choosing ? (
            <TextField
              id="ai-build-agent"
              select
              label="Agent"
              value={agent}
              onChange={e => setAgent(e.target.value as AiBuildAgent)}
              size="small"
              variant="outlined"
              style={{ minWidth: 220 }}
            >
              {offered.map(o => (
                <MenuItem key={o.agent} value={o.agent}>
                  {AGENT_LABEL[o.agent] ?? o.agent} ({o.model})
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <Button
            variant="outlined"
            disabled={busy}
            onClick={async () => {
              const text = note.trim() || undefined;
              const issued = await act(() =>
                choosing && agent
                  ? props.issue(text, agent)
                  : props.issue(text),
              );
              if (issued) setNote('');
            }}
          >
            {busy ? 'Working…' : 'Assign to AI build'}
          </Button>
        </Box>
      )}
      {items === null && !error ? (
        <Typography variant="body2" color="textSecondary">
          Loading…
        </Typography>
      ) : null}
      {items?.length === 0 ? (
        <Typography variant="body2" color="textSecondary">
          No assignment for this version yet.
        </Typography>
      ) : null}
      {items?.map(a => (
        <Box key={a.id} mt={1}>
          <Box display="flex" alignItems="center" style={{ gap: 8 }}>
            <Chip
              size="small"
              label={STATUS[a.status].label}
              style={{
                backgroundColor: NEXORA_TONE[STATUS[a.status].tone].bg,
                color: NEXORA_TONE[STATUS[a.status].tone].fg,
              }}
            />
            {a.pullRequestUrl ? (
              <Link
                href={a.pullRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                #{a.pullRequestNumber}
              </Link>
            ) : null}
            {a.runUrl ? (
              <Link href={a.runUrl} target="_blank" rel="noopener noreferrer">
                run
              </Link>
            ) : null}
            {a.status !== 'NOT_DISPATCHED' ? (
              <Button
                size="small"
                disabled={busy}
                onClick={() => act(() => props.refresh(a.id))}
              >
                Refresh
              </Button>
            ) : null}
          </Box>
          {assignmentLines(a).map(line => (
            <Typography key={line} variant="body2" color="textSecondary">
              {line}
            </Typography>
          ))}
        </Box>
      ))}
      {error ? (
        <Typography
          role="alert"
          variant="body2"
          style={{ color: NEXORA_TONE.danger.text, marginTop: 8 }}
        >
          {error}
        </Typography>
      ) : null}
    </section>
  );
}
