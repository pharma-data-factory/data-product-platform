import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Progress, Table, TableColumn } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Typography } from '@material-ui/core';
import { TraceabilityRow, validationExpertApiRef, ValidationRisk } from '../api';
import { PageShell, StatusChip } from './shared';

export function TraceabilityPage() {
  const api = useApi(validationExpertApiRef);
  const [items, setItems] = useState<TraceabilityRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getTraceability()
      .then(setItems)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed'));
  }, [api]);

  const columns: TableColumn<TraceabilityRow>[] = [
    {
      title: 'URS',
      render: row => (
        <RouterLink to={`/validation-expert/requirements/${row.ursId}`}>{row.ursId}</RouterLink>
      ),
    },
    { title: 'SYS', field: 'sysId' },
    { title: 'TDS', field: 'tdsId' },
    { title: 'Risk', render: row => row.risks.join(', ') },
    { title: 'IQ/OQ/UAT', render: row => row.formalTests.join(', ') },
    { title: 'Evidence', field: 'evidence' },
    {
      title: 'Gaps',
      render: row => (row.gaps.length ? row.gaps.join(', ') : '—'),
    },
  ];

  if (error) {
    return (
      <PageShell title="Traceability">
        <Typography color="error">{error}</Typography>
      </PageShell>
    );
  }
  if (!items.length) {
    return (
      <PageShell title="Traceability">
        <Progress />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Traceability"
      subtitle="URS → SYS → TDS → Risk → IQ/OQ/UAT → Evidence (table view; no graph database)."
    >
      <Table
        options={{ paging: true, pageSize: 25, search: true }}
        columns={columns}
        data={items}
      />
      <Typography variant="h6" style={{ marginTop: 24 }}>
        Detail / tree (selected chains)
      </Typography>
      <ul>
        {items.slice(0, 8).map(row => (
          <li key={row.ursId} style={{ marginBottom: 8 }}>
            <code>
              {row.ursId} → {row.sysId} → {row.tdsId} → {row.risks.join(',')} →{' '}
              {row.formalTests.join(',')} → {row.evidence}
            </code>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}

export function RisksPage() {
  const api = useApi(validationExpertApiRef);
  const [items, setItems] = useState<ValidationRisk[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getRisks()
      .then(setItems)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed'));
  }, [api]);

  const columns: TableColumn<ValidationRisk>[] = [
    { title: 'Risk ID', field: 'id' },
    { title: 'Title', field: 'title' },
    {
      title: 'Description',
      render: row => row.description.slice(0, 140),
    },
    { title: 'Severity', field: 'severity' },
    {
      title: 'Related URS',
      render: row => row.relatedRequirements.join(', ') || '—',
    },
    {
      title: 'Controls',
      render: row => (row.controls ? row.controls.slice(0, 80) : '—'),
    },
    {
      title: 'Formal tests',
      render: row => row.formalTests.join(', ') || '—',
    },
    {
      title: 'Status',
      render: row => <StatusChip value={row.status} />,
    },
  ];

  if (error) {
    return (
      <PageShell title="Risks">
        <Typography color="error">{error}</Typography>
      </PageShell>
    );
  }
  if (!items.length) {
    return (
      <PageShell title="Risks">
        <Progress />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Risks"
      subtitle="Read-only in v0.1. Risk acceptance is not available to Developer (or any role) in this UI."
    >
      <Table options={{ paging: true, pageSize: 20, search: true }} columns={columns} data={items} />
    </PageShell>
  );
}
