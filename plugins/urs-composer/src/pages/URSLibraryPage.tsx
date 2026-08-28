/**
 * URS Library Page
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Header,
  Page,
  Content,
  ContentHeader,
  Table,
  TableColumn,
  Progress,
  Link,
} from '@backstage/core-components';
import { Button, TextField, Box, Chip } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import EditIcon from '@material-ui/icons/Edit';
import { ursComposerApi } from '../api/ursComposerApi';
import { RequirementSet, URSStatus } from '../api/types';

export const URSLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RequirementSet[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    ursComposerApi
      .listRequirementSets()
      .then(result => {
        if (mounted) {
          setItems(result.items);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message || 'Failed to load requirement sets');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter(item =>
      [
        item.requirementSetId,
        item.solutionName,
        item.businessNeed,
        item.status,
        ...(item.businessCapabilityRefs || []),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [items, query]);

  const columns: TableColumn<RequirementSet>[] = [
    {
      title: 'URS ID',
      field: 'requirementSetId',
      render: row => (
        <Link to={`/urs/${row.id}`} onClick={e => e.preventDefault()}>
          <Button size="small" onClick={() => navigate(`/urs/${row.id}`)}>
            {row.requirementSetId}
          </Button>
        </Link>
      ),
    },
    {
      title: 'Title',
      field: 'solutionName',
    },
    {
      title: 'Business Capability',
      render: row => (row.businessCapabilityRefs || []).join(', ') || '—',
    },
    {
      title: 'Solution Type',
      field: 'solutionType',
    },
    {
      title: 'Status',
      render: row => <Chip size="small" label={row.status} />,
    },
    {
      title: 'Version',
      render: row => row.versionNumber,
    },
    {
      title: 'Owner',
      field: 'createdBy',
    },
    {
      title: 'Updated',
      render: row => row.updatedAt || row.createdAt,
    },
    {
      title: 'Actions',
      render: row => (
        <Box display="flex" style={{ gap: 8 }}>
          <Button size="small" onClick={() => navigate(`/urs/${row.id}`)}>
            Open
          </Button>
          {row.status === URSStatus.DRAFT && (
            <Button
              size="small"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/urs/${row.id}/edit`)}
            >
              Edit
            </Button>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Page themeId="tool">
      <Header title="URS Library" subtitle="Persisted Requirement Sets" />
      <Content>
        <ContentHeader title="Browse Requirement Sets">
          <Button
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/urs/new')}
          >
            Create URS
          </Button>
        </ContentHeader>

        <Box marginBottom={2}>
          <TextField
            label="Search"
            placeholder="Filter by ID, title, capability, or status"
            fullWidth
            value={query}
            onChange={e => setQuery(e.target.value)}
            variant="outlined"
            size="small"
          />
        </Box>

        {loading && <Progress />}
        {error && <Box color="error.main">{error}</Box>}
        {!loading && !error && (
          <Table
            options={{ paging: true, pageSize: 10, search: false }}
            columns={columns}
            data={filtered}
            title="Requirement Sets"
          />
        )}
      </Content>
    </Page>
  );
};
