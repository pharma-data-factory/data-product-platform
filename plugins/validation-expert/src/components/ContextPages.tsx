import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Progress } from '@backstage/core-components';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import {
  canStartValidationRun,
  resolvePlatformRole,
} from '@internal/platform-common';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@material-ui/core';
import {
  validationExpertApiRef,
  ContextCoverage,
  ValidationContext,
  ValidationContextRequirement,
  ValidationRun,
} from '../api';
import { NX, PageShell, PrimaryActionButton, StatusChip } from './shared';

function formatWhen(value?: string) {
  if (!value) {
    return '—';
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Date(parsed).toLocaleString();
}

export function ContextsPage() {
  const api = useApi(validationExpertApiRef);
  const [items, setItems] = useState<ValidationContext[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getContexts()
      .then(setItems)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed'));
  }, [api]);

  if (error) {
    return (
      <PageShell title="Validation contexts">
        <Typography color="error">{error}</Typography>
      </PageShell>
    );
  }

  if (!items) {
    return (
      <PageShell title="Validation contexts">
        <Progress />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Validation contexts"
      subtitle="Each context is anchored to one APPROVED URS baseline (set + baseline identity). Validation Expert does not mutate the baseline."
    >
      {items.length === 0 ? (
        <Typography color="textSecondary">
          No validation contexts yet. Start one from an approved URS baseline
          (URS Composer → Validation handoff).
        </Typography>
      ) : (
        <Table size="small" aria-label="Validation contexts">
          <TableHead>
            <TableRow>
              <TableCell>Context</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>URS set</TableCell>
              <TableCell>Baseline</TableCell>
              <TableCell>Approval</TableCell>
              <TableCell>Requirements</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(row => (
              <TableRow key={row.id}>
                <TableCell>
                  <RouterLink
                    to={`/validation-expert/contexts/${encodeURIComponent(row.id)}`}
                  >
                    {row.id}
                  </RouterLink>
                </TableCell>
                <TableCell>
                  <StatusChip value={row.status} />
                </TableCell>
                <TableCell>
                  <RouterLink
                    to={`/urs-composer/${encodeURIComponent(
                      row.source.requirementSetId,
                    )}`}
                  >
                    {row.source.requirementSetTitle || row.source.requirementSetId}
                  </RouterLink>
                </TableCell>
                <TableCell>
                  {row.source.baselineVersion || '—'} ({row.source.baselineId})
                </TableCell>
                <TableCell>
                  <StatusChip value={row.source.approvalStatus} />
                </TableCell>
                <TableCell>{row.source.requirementIds?.length ?? 0}</TableCell>
                <TableCell>{formatWhen(row.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageShell>
  );
}

export function ContextDetailPage() {
  const { contextId = '' } = useParams<{ contextId: string }>();
  const api = useApi(validationExpertApiRef);
  const identityApi = useApi(identityApiRef);
  const navigate = useNavigate();
  const [context, setContext] = useState<ValidationContext | null>(null);
  const [requirements, setRequirements] = useState<
    ValidationContextRequirement[] | null
  >(null);
  const [requirementsNote, setRequirementsNote] = useState<string>('');
  const [requirementsError, setRequirementsError] = useState<string | null>(null);
  const [runs, setRuns] = useState<ValidationRun[] | null>(null);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<ContextCoverage | null>(null);
  const [coverageError, setCoverageError] = useState<string | null>(null);
  const [canStart, setCanStart] = useState(false);
  const [busyType, setBusyType] = useState<'IQ' | 'OQ' | 'UAT' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contextId) {
      setError('Missing context id');
      return;
    }
    api
      .getContext(contextId)
      .then(setContext)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed'));
  }, [api, contextId]);

  useEffect(() => {
    if (!contextId) {
      return;
    }
    setRequirements(null);
    setRequirementsError(null);
    api
      .getContextRequirements(contextId)
      .then(payload => {
        setRequirements(payload.items);
        setRequirementsNote(payload.note);
      })
      .catch(err =>
        setRequirementsError(
          err instanceof Error ? err.message : 'Failed to load baseline requirements',
        ),
      );
  }, [api, contextId]);

  useEffect(() => {
    if (!contextId) {
      return;
    }
    setRuns(null);
    setRunsError(null);
    setCoverage(null);
    setCoverageError(null);
    api
      .getContextRuns(contextId)
      .then(setRuns)
      .catch(err =>
        setRunsError(err instanceof Error ? err.message : 'Failed to load runs'),
      );
    api
      .getContextCoverage(contextId)
      .then(setCoverage)
      .catch(err =>
        setCoverageError(
          err instanceof Error ? err.message : 'Failed to load coverage',
        ),
      );
    identityApi.getBackstageIdentity().then(identity => {
      setCanStart(
        canStartValidationRun(resolvePlatformRole(identity.ownershipEntityRefs)),
      );
    });
  }, [api, contextId, identityApi]);

  async function startRun(type: 'IQ' | 'OQ' | 'UAT') {
    if (!contextId) {
      return;
    }
    setBusyType(type);
    setRunsError(null);
    try {
      const created = await api.createRun('platform-core-v1.0-rc2', type, {
        contextId,
      });
      if (type === 'IQ' || type === 'OQ') {
        await api.executeAutomated(created.runId);
      }
      navigate(`/validation-expert/runs/${encodeURIComponent(created.runId)}`);
    } catch (err) {
      setRunsError(err instanceof Error ? err.message : 'Failed to start run');
    } finally {
      setBusyType(null);
    }
  }

  if (error) {
    return (
      <PageShell title={contextId || 'Validation context'}>
        <Typography color="error">{error}</Typography>
        <Box mt={2}>
          <RouterLink to="/validation-expert/contexts">Back to contexts</RouterLink>
        </Box>
      </PageShell>
    );
  }

  if (!context) {
    return (
      <PageShell title={contextId || 'Validation context'}>
        <Progress />
      </PageShell>
    );
  }

  const { source } = context;
  const requirementIds = source.requirementIds ?? [];

  return (
    <PageShell
      title={context.id}
      subtitle="Approved URS reference for this validation context (read-only handoff snapshot)."
    >
      <Box mb={2}>
        <RouterLink to="/validation-expert/contexts">← All contexts</RouterLink>
      </Box>

      <Box mb={3} display="flex" alignItems="center" style={{ gap: 12 }}>
        <Typography component="span">
          <strong>Context status</strong>
        </Typography>
        <StatusChip value={context.status} />
      </Box>

      <Typography paragraph>
        <strong>Created</strong>
        <br />
        {formatWhen(context.createdAt)}
        {context.createdBy ? ` · ${context.createdBy}` : ''}
      </Typography>
      {context.summary ? (
        <Typography paragraph>
          <strong>Summary</strong>
          <br />
          {context.summary}
        </Typography>
      ) : null}

      <Box
        mt={3}
        mb={2}
        p={2}
        style={{
          border: `1px solid ${NX.border}`,
          borderRadius: 8,
          background: NX.card,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Approved URS reference
        </Typography>
        <Typography paragraph>
          <strong>Requirement set</strong>
          <br />
          <RouterLink
            to={`/urs-composer/${encodeURIComponent(source.requirementSetId)}`}
          >
            {source.requirementSetTitle ||
              source.requirementSetName ||
              source.requirementSetId}
          </RouterLink>
          <br />
          <Typography component="span" variant="body2" color="textSecondary">
            {source.requirementSetId}
          </Typography>
        </Typography>
        <Typography paragraph>
          <strong>Baseline</strong>
          <br />
          Version {source.baselineVersion || '—'}
          <br />
          <Typography component="span" variant="body2" color="textSecondary">
            {source.baselineId}
          </Typography>
        </Typography>
        <Box mb={2}>
          <Typography>
            <strong>Approval</strong>
          </Typography>
          <Box mt={1} display="flex" alignItems="center" style={{ gap: 8 }}>
            <StatusChip value={source.approvalStatus} />
            <Typography variant="body2" color="textSecondary">
              {[source.approvedBy, source.approvedAt ? formatWhen(source.approvedAt) : null]
                .filter(Boolean)
                .join(' · ') || '—'}
            </Typography>
          </Box>
        </Box>
        <Typography paragraph>
          <strong>Source system</strong>
          <br />
          {source.sourceSystem || 'urs-composer'}
        </Typography>
        <Typography paragraph>
          <strong>Business capabilities</strong>
          <br />
          {(source.businessCapabilityIds || []).join(', ') || '—'}
        </Typography>
      </Box>

      <Box mt={3}>
        <Typography variant="h6" gutterBottom>
          Baseline requirements (read-through)
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          {requirementsNote ||
            'Pinned URS baseline content via Validation Expert → URS Composer. Not a GxP validation claim.'}
        </Typography>
        <Box mb={2}>
          <RouterLink
            to={`/validation-expert/requirements?contextId=${encodeURIComponent(
              context.id,
            )}`}
          >
            Open in Requirements view
          </RouterLink>
        </Box>
        {requirementsError ? (
          <Typography color="error">{requirementsError}</Typography>
        ) : null}
        {!requirementsError && !requirements ? <Progress /> : null}
        {requirements && requirements.length === 0 ? (
          <Typography color="textSecondary">
            No requirement content resolved for this baseline yet.
            {requirementIds.length
              ? ` Stable IDs on context: ${requirementIds.join(', ')}.`
              : ''}
          </Typography>
        ) : null}
        {requirements && requirements.length > 0 ? (
          <Table size="small" aria-label="Baseline requirements">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Statement</TableCell>
                <TableCell>Priority</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requirements.map(item => (
                <TableRow key={item.requirementId}>
                  <TableCell style={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {item.requirementId}
                  </TableCell>
                  <TableCell>{item.title}</TableCell>
                  <TableCell>
                    {item.statement.length > 180
                      ? `${item.statement.slice(0, 180)}…`
                      : item.statement || '—'}
                  </TableCell>
                  <TableCell>{item.priority || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </Box>

      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Requirement coverage (lite)
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          {coverage?.note ||
            'Joins context requirement IDs to protocol tests via linked run executions and findings. Not a GxP validation claim.'}
        </Typography>
        {coverageError ? (
          <Typography color="error">{coverageError}</Typography>
        ) : null}
        {!coverageError && !coverage ? <Progress /> : null}
        {coverage ? (
          <>
            <Typography paragraph>
              <strong>
                {coverage.covered.length}/{coverage.expected.length}
              </strong>{' '}
              expected requirements touched
              {coverage.extra.length
                ? ` · ${coverage.extra.length} extra ID(s) from runs/findings`
                : ''}
            </Typography>
            {coverage.byRequirement.length === 0 ? (
              <Typography color="textSecondary">
                No requirement IDs on this context snapshot yet.
              </Typography>
            ) : (
              <Table size="small" aria-label="Requirement coverage">
                <TableHead>
                  <TableRow>
                    <TableCell>Requirement</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Tests</TableCell>
                    <TableCell>Runs</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {coverage.byRequirement.map(row => (
                    <TableRow key={`${row.status}-${row.requirementId}`}>
                      <TableCell style={{ fontFamily: 'monospace' }}>
                        {row.requirementId}
                      </TableCell>
                      <TableCell>
                        <StatusChip value={row.status} />
                      </TableCell>
                      <TableCell>
                        {row.testIds.length ? row.testIds.join(', ') : '—'}
                      </TableCell>
                      <TableCell>
                        {row.runIds.length
                          ? row.runIds.map((runId, index) => (
                              <span key={runId}>
                                {index > 0 ? ', ' : null}
                                <RouterLink
                                  to={`/validation-expert/runs/${encodeURIComponent(
                                    runId,
                                  )}`}
                                >
                                  {runId}
                                </RouterLink>
                              </span>
                            ))
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        ) : null}
      </Box>

      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Linked runs
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Runs started from this context use the approved URS baseline identity
          as baselineId. Protocol steps still come from the platform Markdown
          workbench (not a GxP claim).
        </Typography>
        {canStart ? (
          <Box mb={2} display="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
            {(['IQ', 'OQ', 'UAT'] as const).map(type => (
              <PrimaryActionButton
                key={type}
                disabled={Boolean(busyType)}
                onClick={() => startRun(type)}
              >
                {busyType === type ? `Starting ${type}…` : `Start ${type} run`}
              </PrimaryActionButton>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="textSecondary" paragraph>
            Your role cannot start validation runs.
          </Typography>
        )}
        {runsError ? <Typography color="error">{runsError}</Typography> : null}
        {!runsError && !runs ? <Progress /> : null}
        {runs && runs.length === 0 ? (
          <Typography color="textSecondary">
            No runs linked to this context yet.
          </Typography>
        ) : null}
        {runs && runs.length > 0 ? (
          <Table size="small" aria-label="Context runs">
            <TableHead>
              <TableRow>
                <TableCell>Run</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Baseline</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {runs.map(run => (
                <TableRow key={run.id}>
                  <TableCell>
                    <RouterLink
                      to={`/validation-expert/runs/${encodeURIComponent(run.id)}`}
                    >
                      {run.id}
                    </RouterLink>
                  </TableCell>
                  <TableCell>{run.type}</TableCell>
                  <TableCell>
                    <StatusChip value={run.status} />
                  </TableCell>
                  <TableCell style={{ fontFamily: 'monospace' }}>
                    {run.baselineId || '—'}
                  </TableCell>
                  <TableCell>{formatWhen(run.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </Box>
    </PageShell>
  );
}
