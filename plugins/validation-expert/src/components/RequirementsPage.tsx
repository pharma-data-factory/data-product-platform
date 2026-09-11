import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { Progress, Table, TableColumn } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { TextField, Typography } from '@material-ui/core';
import {
  validationExpertApiRef,
  ValidationContextRequirement,
  ValidationRequirement,
} from '../api';
import { PageShell, StatusChip } from './shared';

export function RequirementsPage() {
  const api = useApi(validationExpertApiRef);
  const [searchParams] = useSearchParams();
  const contextId = (searchParams.get('contextId') || '').trim();
  const [items, setItems] = useState<ValidationRequirement[]>([]);
  const [contextItems, setContextItems] = useState<
    ValidationContextRequirement[] | null
  >(null);
  const [contextMeta, setContextMeta] = useState<{
    baselineVersion?: string;
    note?: string;
  }>({});
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (contextId) {
      setContextItems(null);
      api
        .getContextRequirements(contextId)
        .then(payload => {
          setContextItems(payload.items);
          setContextMeta({
            baselineVersion: payload.baselineVersion,
            note: payload.note,
          });
        })
        .catch(err => setError(err instanceof Error ? err.message : 'Failed'));
      return;
    }
    setContextItems(null);
    api
      .getRequirements()
      .then(setItems)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed'));
  }, [api, contextId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter(item =>
      `${item.id} ${item.requirement} ${item.baselineState} ${item.implementation}`
        .toLowerCase()
        .includes(q),
    );
  }, [items, query]);

  const filteredContext = useMemo(() => {
    const list = contextItems ?? [];
    const q = query.trim().toLowerCase();
    if (!q) {
      return list;
    }
    return list.filter(item =>
      `${item.requirementId} ${item.title} ${item.statement}`
        .toLowerCase()
        .includes(q),
    );
  }, [contextItems, query]);

  const active = filtered.filter(item => !item.rejected);
  const rejected = filtered.filter(item => item.rejected);

  const columns: TableColumn<ValidationRequirement>[] = [
    {
      title: 'ID',
      field: 'id',
      render: row => (
        <RouterLink to={`/validation-expert/requirements/${row.id}`}>{row.id}</RouterLink>
      ),
    },
    {
      title: 'Requirement',
      field: 'requirement',
      render: row => row.requirement.slice(0, 120),
    },
    {
      title: 'Baseline',
      field: 'baselineState',
      render: row => <StatusChip value={row.baselineState} />,
    },
    { title: 'Implementation', field: 'implementation' },
    { title: 'Verification', field: 'verification' },
    {
      title: 'Risk',
      render: row => row.risks.join(', ') || row.riskLevel || '—',
    },
    {
      title: 'Formal tests',
      render: row => row.formalTests.join(', ') || '—',
    },
  ];

  const contextColumns: TableColumn<ValidationContextRequirement>[] = [
    {
      title: 'ID',
      field: 'requirementId',
      render: row => (
        <span style={{ fontFamily: 'monospace' }}>{row.requirementId}</span>
      ),
    },
    { title: 'Title', field: 'title' },
    {
      title: 'Statement',
      field: 'statement',
      render: row =>
        row.statement.length > 160
          ? `${row.statement.slice(0, 160)}…`
          : row.statement || '—',
    },
    {
      title: 'Priority',
      field: 'priority',
      render: row => row.priority || '—',
    },
    {
      title: 'Status',
      field: 'status',
      render: row =>
        row.status ? <StatusChip value={row.status} /> : '—',
    },
  ];

  if (error) {
    return (
      <PageShell title="Requirements">
        <Typography color="error">{error}</Typography>
      </PageShell>
    );
  }

  if (contextId) {
    if (!contextItems && !error) {
      return (
        <PageShell title="Requirements">
          <Progress />
        </PageShell>
      );
    }
    return (
      <PageShell
        title="Requirements"
        subtitle={`URS baseline read-through for validation context ${contextId}${
          contextMeta.baselineVersion
            ? ` (baseline ${contextMeta.baselineVersion})`
            : ''
        }. ${contextMeta.note || 'Not a GxP validation claim.'}`}
      >
        <Typography variant="body2" style={{ marginBottom: 12 }}>
          <RouterLink to={`/validation-expert/contexts/${encodeURIComponent(contextId)}`}>
            ← Context detail
          </RouterLink>
          {' · '}
          <RouterLink to="/validation-expert/requirements">
            Platform Markdown requirements
          </RouterLink>
        </Typography>
        <TextField
          size="small"
          variant="outlined"
          label="Search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          style={{ marginBottom: 16, minWidth: 280 }}
        />
        <Table
          title={`Baseline requirements (${filteredContext.length})`}
          options={{ paging: true, pageSize: 20, search: false }}
          columns={contextColumns}
          data={filteredContext}
        />
      </PageShell>
    );
  }

  if (!items.length && !error) {
    return (
      <PageShell title="Requirements">
        <Progress />
      </PageShell>
    );
  }

  return (
    <PageShell title="Requirements" subtitle="Active URS from the authoritative baseline (read-only).">
      <TextField
        size="small"
        variant="outlined"
        label="Search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        style={{ marginBottom: 16, minWidth: 280 }}
      />
      <Table
        title={`Active (${active.length})`}
        options={{ paging: true, pageSize: 20, search: false }}
        columns={columns}
        data={active}
      />
      {rejected.length ? (
        <div style={{ marginTop: 24 }}>
          <Typography variant="h6">Rejected (historical)</Typography>
          <Table
            options={{ paging: false, search: false }}
            columns={columns}
            data={rejected}
          />
        </div>
      ) : null}
    </PageShell>
  );
}

export function RequirementDetailPage() {
  const { id = '' } = useParams();
  const api = useApi(validationExpertApiRef);
  const [item, setItem] = useState<ValidationRequirement | null>(null);
  const [trace, setTrace] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getRequirement(id)
      .then(result => {
        setItem(result.item);
        setTrace(
          result.trace
            ? [
                result.trace.sysId,
                result.trace.tdsId,
                ...result.trace.risks,
                ...result.trace.formalTests,
              ].join(' → ')
            : 'No trace row',
        );
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed'));
  }, [api, id]);

  if (error) {
    return (
      <PageShell title={id}>
        <Typography color="error">{error}</Typography>
      </PageShell>
    );
  }
  if (!item) {
    return (
      <PageShell title={id}>
        <Progress />
      </PageShell>
    );
  }

  return (
    <PageShell title={item.id} subtitle={item.rejected ? 'Rejected historical requirement' : 'BASELINED'}>
      <Typography paragraph>
        <strong>Requirement</strong>
        <br />
        {item.requirement}
      </Typography>
      <Typography paragraph>
        <strong>Status:</strong> {item.baselineState}
      </Typography>
      <Typography paragraph>
        <strong>Implementation:</strong> {item.implementation}
      </Typography>
      <Typography paragraph>
        <strong>Formal Verification:</strong> {item.formalTests.join(', ') || item.verification}
      </Typography>
      <Typography paragraph>
        <strong>Traceability:</strong> {trace}
      </Typography>
    </PageShell>
  );
}
