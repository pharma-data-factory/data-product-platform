import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Progress, Table, TableColumn } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Typography } from '@material-ui/core';
import {
  ProtocolResponse,
  ProtocolTest,
  validationExpertApiRef,
} from '../api';
import { PageShell, StatusChip } from './shared';

function ProtocolPage({ type }: { type: 'IQ' | 'OQ' | 'UAT' }) {
  const api = useApi(validationExpertApiRef);
  const [data, setData] = useState<ProtocolResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getProtocol(type)
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed'));
  }, [api, type]);

  const columns: TableColumn<ProtocolTest>[] = [
    { title: 'Test ID', field: 'id' },
    { title: 'Title', field: 'title' },
    {
      title: 'Related URS',
      render: row => row.requirementIds.join(', ') || '—',
    },
    { title: 'Execution type', field: 'executionType' },
    {
      title: 'Status',
      render: row => <StatusChip value={row.status} />,
    },
    { title: 'Domain', field: 'domain' },
  ];

  if (!data && !error) {
    return (
      <PageShell title={`${type} protocol`}>
        <Progress />
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`${type} protocol`}
      subtitle="Protocol view derived from validation/ artifacts. Runs are started from a validation context (Contexts) — each run is anchored to an approved URS baseline plus an assigned product solution."
    >
      {error ? <Typography color="error">{error}</Typography> : null}
      {data ? (
        <>
          <Typography paragraph>
            Total {data.total} · Ready {data.ready} · Manual {data.manual} · External{' '}
            {data.external} · Automated {data.automated}
          </Typography>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {[...new Set(data.tests.map(test => test.domain).filter(Boolean))].map(domain => (
              <StatusChip key={domain} value={String(domain)} />
            ))}
          </div>
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
            <RouterLink to="/validation-expert/contexts">
              Start runs from a validation context
            </RouterLink>
          </Typography>
          <Table
            options={{ paging: true, pageSize: 20, search: true }}
            columns={columns}
            data={data.tests}
          />
        </>
      ) : null}
    </PageShell>
  );
}

export function IqPage() {
  return <ProtocolPage type="IQ" />;
}

export function OqPage() {
  return <ProtocolPage type="OQ" />;
}

export function UatPage() {
  return <ProtocolPage type="UAT" />;
}

export function RunsPage() {
  const api = useApi(validationExpertApiRef);
  const [items, setItems] = useState<Awaited<ReturnType<typeof api.listRuns>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listRuns()
      .then(setItems)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed'));
  }, [api]);

  return (
    <PageShell title="Validation Runs" subtitle="Immutable after completion. New executions create new run IDs.">
      {error ? <Typography color="error">{error}</Typography> : null}
      <Table
        options={{ paging: true, search: false }}
        columns={[
          {
            title: 'Run ID',
            render: row => (
              <RouterLink to={`/validation-expert/runs/${row.id}`}>{row.id}</RouterLink>
            ),
          },
          { title: 'Type', field: 'type' },
          { title: 'Candidate', field: 'candidate' },
          {
            title: 'Status',
            render: row => <StatusChip value={row.status} />,
          },
          {
            title: 'Created by',
            render: row => row.createdBy.userEntityRef,
          },
          { title: 'Created at', field: 'createdAt' },
        ]}
        data={items}
      />
    </PageShell>
  );
}
