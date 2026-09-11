import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Progress, Table } from '@backstage/core-components';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import {
  canExecuteValidationTest,
  resolvePlatformRole,
} from '@internal/platform-common';
import { Button, TextField, Typography } from '@material-ui/core';
import {
  ProtocolTest,
  ValidationRun,
  validationExpertApiRef,
} from '../api';
import { NX, PageShell, PrimaryActionButton, StatusChip } from './shared';

export function RunDetailPage() {
  const { runId = '' } = useParams();
  const api = useApi(validationExpertApiRef);
  const [run, setRun] = useState<ValidationRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getRun(runId)
      .then(setRun)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed'));
  }, [api, runId]);

  if (error) {
    return (
      <PageShell title={runId}>
        <Typography color="error">{error}</Typography>
      </PageShell>
    );
  }
  if (!run) {
    return (
      <PageShell title={runId}>
        <Progress />
      </PageShell>
    );
  }

  return (
    <PageShell title={run.id} subtitle={`${run.type} · ${run.candidate} · ${run.status}`}>
      <Typography paragraph>
        Created by {run.createdBy.userEntityRef}
        {run.createdBy.identityProvider ? ` (${run.createdBy.identityProvider})` : ''} at{' '}
        {run.createdAt}
      </Typography>
      {run.contextId ? (
        <Typography paragraph>
          <strong>Validation context:</strong>{' '}
          <RouterLink
            to={`/validation-expert/contexts/${encodeURIComponent(run.contextId)}`}
          >
            {run.contextId}
          </RouterLink>
          {run.baselineId ? (
            <>
              {' '}
              · baseline <span style={{ fontFamily: 'monospace' }}>{run.baselineId}</span>
            </>
          ) : null}
        </Typography>
      ) : null}
      <Table
        options={{ paging: false, search: false }}
        columns={[
          {
            title: 'Test',
            render: row => (
              <RouterLink to={`/validation-expert/runs/${run.id}/tests/${row.testId}`}>
                {row.testId}
              </RouterLink>
            ),
          },
          { title: 'Type', field: 'type' },
          {
            title: 'Status',
            render: row => <StatusChip value={row.status} />,
          },
          {
            title: 'Executor',
            render: row => row.executor?.userEntityRef ?? '—',
          },
          {
            title: 'Actual',
            render: row => row.actualResult?.slice(0, 120) ?? '—',
          },
          {
            title: 'Finding',
            render: row => row.findingId ?? '—',
          },
        ]}
        data={run.executions}
      />
    </PageShell>
  );
}

export function ManualTestPage() {
  const { runId = '', testId = '' } = useParams();
  const api = useApi(validationExpertApiRef);
  const identityApi = useApi(identityApiRef);
  const [protocolTest, setProtocolTest] = useState<ProtocolTest | null>(null);
  const [executor, setExecutor] = useState<string>('');
  const [canExecute, setCanExecute] = useState(false);
  const [actualResult, setActualResult] = useState('');
  const [comment, setComment] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    identityApi.getBackstageIdentity().then(identity => {
      setExecutor(identity.userEntityRef);
      setCanExecute(
        canExecuteValidationTest(resolvePlatformRole(identity.ownershipEntityRefs)),
      );
    });
    api
      .getRun(runId)
      .then(async run => {
        const protocol = await api.getProtocol(run.type as 'IQ' | 'OQ' | 'UAT');
        setProtocolTest(protocol.tests.find(test => test.id === testId) ?? null);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed'));
  }, [api, identityApi, runId, testId]);

  async function start() {
    setError(null);
    try {
      await api.startTest(runId, testId);
      setMessage('Test started. Executor captured from current session.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Start failed');
    }
  }

  async function record(status: 'PASS' | 'FAIL' | 'BLOCKED') {
    setError(null);
    try {
      await api.recordResult(runId, testId, {
        status,
        actualResult,
        comment: comment || undefined,
        evidenceReference: evidenceReference || undefined,
      });
      setMessage(`Recorded ${status}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Record failed');
    }
  }

  if (error && !protocolTest) {
    return (
      <PageShell title={testId}>
        <Typography color="error">{error}</Typography>
      </PageShell>
    );
  }

  if (!protocolTest) {
    return (
      <PageShell title={testId}>
        <Progress />
      </PageShell>
    );
  }

  return (
    <PageShell title={protocolTest.id} subtitle={protocolTest.title}>
      <Typography paragraph>
        <strong>Expected Result</strong>
        <br />
        {protocolTest.expectedResult}
      </Typography>
      <Typography paragraph>
        <strong>Executor</strong>
        <br />
        {executor || 'Not authenticated'}
      </Typography>
      <Typography paragraph>
        <strong>Procedure</strong>
        <br />
        {protocolTest.procedure}
      </Typography>
      {canExecute ? (
        <Button variant="outlined" onClick={start} style={{ marginBottom: 16 }}>
          Start Test
        </Button>
      ) : (
        <Typography color="textSecondary">Manual execution requires Developer role.</Typography>
      )}
      <TextField
        fullWidth
        multiline
        minRows={3}
        label="Actual Result"
        value={actualResult}
        onChange={event => setActualResult(event.target.value)}
        style={{ marginBottom: 12 }}
      />
      <TextField
        fullWidth
        label="Comment (required on FAIL)"
        value={comment}
        onChange={event => setComment(event.target.value)}
        style={{ marginBottom: 12 }}
      />
      <TextField
        fullWidth
        label="Evidence reference"
        value={evidenceReference}
        onChange={event => setEvidenceReference(event.target.value)}
        style={{ marginBottom: 12 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <PrimaryActionButton
          disabled={!canExecute || !actualResult.trim()}
          onClick={() => record('PASS')}
        >
          PASS
        </PrimaryActionButton>
        <Button
          variant="contained"
          disableElevation
          disabled={!canExecute || !actualResult.trim()}
          onClick={() => record('FAIL')}
          style={{
            backgroundColor: NX.failBg,
            color: NX.failFg,
            fontWeight: 600,
            textTransform: 'none',
          }}
        >
          FAIL
        </Button>
        <Button
          variant="outlined"
          disabled={!canExecute || !actualResult.trim()}
          onClick={() => record('BLOCKED')}
          style={{
            borderColor: NX.security,
            color: NX.warnFg,
            fontWeight: 600,
            textTransform: 'none',
          }}
        >
          BLOCKED
        </Button>
      </div>
      {message ? <Typography style={{ marginTop: 12 }}>{message}</Typography> : null}
      {error ? (
        <Typography color="error" style={{ marginTop: 12 }}>
          {error}
        </Typography>
      ) : null}
      <Typography variant="body2" color="textSecondary" style={{ marginTop: 16 }}>
        Anonymous PASS is not permitted. EXTERNAL tests cannot be mocked as PASS.
      </Typography>
    </PageShell>
  );
}

export function EvidencePage() {
  const api = useApi(validationExpertApiRef);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getEvidence()
      .then(setItems)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed'));
  }, [api]);

  return (
    <PageShell title="Evidence" subtitle="Artifact index plus runtime evidence metadata. No secrets.">
      {error ? <Typography color="error">{error}</Typography> : null}
      <Table
        options={{ paging: true, pageSize: 25, search: true }}
        columns={[
          { title: 'ID', field: 'id' },
          { title: 'Test', field: 'testId' },
          { title: 'Type', field: 'evidenceType' },
          { title: 'Reference', field: 'reference' },
          { title: 'Source', field: 'source' },
          { title: 'Created', field: 'createdAt' },
          { title: 'By', field: 'createdBy' },
        ]}
        data={items}
      />
    </PageShell>
  );
}

export function FindingsPage() {
  const api = useApi(validationExpertApiRef);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getFindings()
      .then(setItems)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed'));
  }, [api]);

  return (
    <PageShell
      title="Findings"
      subtitle="Failures create findings. No automatic remediation. Closure requires controlled retest."
    >
      {error ? <Typography color="error">{error}</Typography> : null}
      <Table
        options={{ paging: true, pageSize: 20, search: true }}
        columns={[
          { title: 'ID', field: 'id' },
          { title: 'Source test', field: 'testId' },
          { title: 'Severity', field: 'severity' },
          {
            title: 'Description',
            render: row => String(row.description ?? '').slice(0, 140),
          },
          {
            title: 'Status',
            render: row => <StatusChip value={String(row.status)} />,
          },
          {
            title: 'Requirements',
            render: row => (row.requirementIds ?? []).join(', '),
          },
          { title: 'Source', field: 'source' },
        ]}
        data={items}
      />
    </PageShell>
  );
}
