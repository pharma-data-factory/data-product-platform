/**
 * URS Library Page
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '@backstage/core-plugin-api';
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
import {
  Button,
  TextField,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import EditIcon from '@material-ui/icons/Edit';
import GetAppIcon from '@material-ui/icons/GetApp';
import { ursComposerApiRef } from '../api/ursComposerApi';
import { Requirement, RequirementSet, URSStatus, SolutionType } from '../api/types';

const STATUS_ORDER: Record<string, number> = {
  DRAFT: 0,
  IN_REVIEW: 1,
  APPROVED: 2,
  BASELINED: 3,
  SUPERSEDED: 4,
  RETIRED: 5,
};

function baselineVersionValue(version: string): number {
  const [major = '0', minor = '0'] = version.split('.');
  return parseInt(major, 10) * 100 + (parseInt(minor, 10) || 0);
}

function parseAcceptanceCriteriaJson(acceptanceIntent?: string) {
  if (!acceptanceIntent) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(acceptanceIntent);
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        title: String(item.title || ''),
        description: item.description ? String(item.description) : undefined,
        verificationMethod: item.verificationMethod
          ? String(item.verificationMethod)
          : undefined,
      }));
    }
  } catch {
    return [{ title: acceptanceIntent }];
  }
  return undefined;
}

export const URSLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const api = useApi(ursComposerApiRef);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RequirementSet[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedRows, setSelectedRows] = useState<RequirementSet[]>([]);
  const [baselineVersions, setBaselineVersions] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    let mounted = true;
    api
      .listRequirementSets()
      .then(async result => {
        if (!mounted) {
          return;
        }
        setItems(result.items);
        const versions: Record<string, string> = {};
        await Promise.all(
          result.items.map(async set => {
            try {
              const baselines = await api.listBaselines(set.id);
              const latest = baselines
                .filter(b => b.status === URSStatus.APPROVED)
                .map(b => b.baselineVersion)
                .sort((a, b) => baselineVersionValue(b) - baselineVersionValue(a))[0];
              if (latest) {
                versions[set.id] = latest;
              }
            } catch {
              // no released baseline — leave the version unset
            }
          }),
        );
        if (mounted) {
          setBaselineVersions(versions);
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
  }, [api]);

  const filtered = useMemo(() => {
    let result = items;

    if (statusFilter !== 'ALL') {
      result = result.filter(item => item.status === statusFilter);
    }

    if (typeFilter !== 'ALL') {
      result = result.filter(item => item.solutionType === typeFilter);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(item =>
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
    }

    return result;
  }, [items, query, statusFilter, typeFilter]);

  const handleExportSelected = async () => {
    if (selectedRows.length === 0) {
      return;
    }
    const enriched = await Promise.all(
      selectedRows.map(async set => {
        let requirements: Requirement[] = [];
        try {
          requirements = await api.listRequirements(set.id);
        } catch {
          requirements = [];
        }
        return {
          businessCapabilityRefs: set.businessCapabilityRefs,
          businessNeed: set.businessNeed,
          desiredOutcome: set.desiredOutcome,
          businessValue: set.businessValue,
          stakeholders: set.stakeholders,
          processContext: set.processContext,
          solutionType: set.solutionType,
          solutionName: set.solutionName,
          solutionCatalogRef: set.solutionCatalogRef,
          scope: set.scope,
          outOfScope: set.outOfScope,
          gxpRelevance: set.gxpRelevance,
          patientImpact: set.patientImpact,
          dataIntegrityImpact: set.dataIntegrityImpact,
          electronicRecords: set.electronicRecords,
          requirements: requirements.map(r => ({
            title: r.title,
            statement: r.statement,
            rationale: r.rationale,
            category: r.category,
            priority: r.priority,
            gxpRelevance: r.gxpRelevance,
            source: r.source,
            owner: r.owner,
            classification: r.classification,
            acceptanceCriteria: parseAcceptanceCriteriaJson(r.acceptanceIntent),
          })),
        };
      }),
    );
    const data = JSON.stringify(enriched.length === 1 ? enriched[0] : enriched, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urs-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const columns: TableColumn<RequirementSet>[] = [
    {
      title: 'URS ID',
      field: 'requirementSetId',
      render: row => (
        <Link to={`/urs-composer/${row.id}`} onClick={e => e.preventDefault()}>
          <Button size="small" onClick={() => navigate(`/urs-composer/${row.id}`)}>
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
      field: 'status',
      render: row => <Chip size="small" label={row.status} />,
      customSort: (a, b) => {
        const orderA = STATUS_ORDER[a.status] ?? 99;
        const orderB = STATUS_ORDER[b.status] ?? 99;
        return orderA - orderB;
      },
    },
    {
      title: 'Version',
      render: row => baselineVersions[row.id] ?? '—',
    },
    {
      title: 'Owner',
      field: 'createdBy',
    },
    {
      title: 'Updated',
      field: 'updatedAt',
      render: row => row.updatedAt || row.createdAt,
      defaultSort: 'desc',
    },
    {
      title: 'Actions',
      sorting: false,
      render: row => (
        <Box display="flex" style={{ gap: 8 }}>
          <Button size="small" onClick={() => navigate(`/urs-composer/${row.id}`)}>
            Open
          </Button>
          {row.status === URSStatus.DRAFT && (
            <Button
              size="small"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/urs-composer/${row.id}/edit`)}
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
            onClick={() => navigate('/urs-composer/new')}
          >
            Create URS
          </Button>
        </ContentHeader>

        <Box display="flex" alignItems="center" style={{ gap: 12, marginBottom: 16 }}>
          <TextField
            label="Search"
            placeholder="Filter by ID, title, capability, or status"
            value={query}
            onChange={e => setQuery(e.target.value)}
            variant="outlined"
            size="small"
            style={{ flex: 1 }}
          />
          <FormControl variant="outlined" size="small" style={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as string)}
              label="Status"
            >
              <MenuItem value="ALL">All Statuses</MenuItem>
              <MenuItem value={URSStatus.DRAFT}>Draft</MenuItem>
              <MenuItem value={URSStatus.IN_REVIEW}>In Review</MenuItem>
              <MenuItem value={URSStatus.APPROVED}>Approved</MenuItem>
              <MenuItem value="BASELINED">Baselined</MenuItem>
              <MenuItem value={URSStatus.SUPERSEDED}>Superseded</MenuItem>
              <MenuItem value={URSStatus.RETIRED}>Retired</MenuItem>
            </Select>
          </FormControl>
          <FormControl variant="outlined" size="small" style={{ minWidth: 160 }}>
            <InputLabel>Solution Type</InputLabel>
            <Select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as string)}
              label="Solution Type"
            >
              <MenuItem value="ALL">All Types</MenuItem>
              <MenuItem value={SolutionType.PROJECT}>Project</MenuItem>
              <MenuItem value={SolutionType.PLUGIN}>Plugin</MenuItem>
              <MenuItem value={SolutionType.COMPONENT}>Component</MenuItem>
              <MenuItem value={SolutionType.DATA_PRODUCT}>Data Product</MenuItem>
            </Select>
          </FormControl>
          {selectedRows.length > 0 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<GetAppIcon />}
              onClick={handleExportSelected}
            >
              Export ({selectedRows.length})
            </Button>
          )}
        </Box>

        {loading && <Progress />}
        {error && <Box color="error.main">{error}</Box>}
        {!loading && !error && (
          <Table
            options={{
              paging: true,
              pageSize: 10,
              search: false,
              selection: true,
              sorting: true,
            }}
            columns={columns}
            data={filtered}
            title="Requirement Sets"
            onSelectionChange={rows => setSelectedRows(rows)}
          />
        )}
      </Content>
    </Page>
  );
};
