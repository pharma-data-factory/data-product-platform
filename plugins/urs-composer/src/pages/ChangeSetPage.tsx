/**
 * Change Set Page — displays delta between two URS baselines.
 */

import { useEffect, useState, useMemo, type FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '@backstage/core-plugin-api';
import {
  Header,
  Page,
  Content,
  Table,
  TableColumn,
  Progress,
} from '@backstage/core-components';
import {
  Typography,
  Card,
  CardContent,
  Box,
  Grid,
  Chip,
  Button,
} from '@material-ui/core';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import AssignmentIcon from '@material-ui/icons/Assignment';
import { NEXORA_STATUS } from '@internal/plugin-nexora-common';
import { ursComposerApiRef } from '../api/ursComposerApi';
import {
  ChangeSet,
  RequirementChange,
  ChangeType,
} from '../api/types';
import { ImpactGraph } from '../components/ImpactGraph/ImpactGraph';

const CHANGE_COLORS: Record<ChangeType, string> = {
  ADDED: NEXORA_STATUS.success,
  MODIFIED: NEXORA_STATUS.warning,
  REMOVED: NEXORA_STATUS.error,
  UNCHANGED: NEXORA_STATUS.pending,
};

const FILTER_OPTIONS: Array<{ label: string; value: ChangeType | 'ALL' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Added', value: 'ADDED' },
  { label: 'Modified', value: 'MODIFIED' },
  { label: 'Removed', value: 'REMOVED' },
  { label: 'Unchanged', value: 'UNCHANGED' },
];

export const ChangeSetPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useApi(ursComposerApiRef);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changeSet, setChangeSet] = useState<ChangeSet | null>(null);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ChangeType | 'ALL'>('ALL');

  useEffect(() => {
    if (!id) {
      return undefined;
    }
    let mounted = true;
    setLoading(true);
    api
      .getChangeSet(id)
      .then(cs => {
        if (mounted) setChangeSet(cs);
      })
      .catch(err => {
        if (mounted) setError(err.message || 'Failed to load change set');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id, api]);

  const filteredChanges = useMemo(() => {
    if (!changeSet) return [];
    if (filterType === 'ALL') return changeSet.changes;
    return changeSet.changes.filter(c => c.changeType === filterType);
  }, [changeSet, filterType]);

  const columns: TableColumn<RequirementChange>[] = useMemo(
    () => [
      {
        title: 'Requirement ID',
        field: 'requirementId',
        width: '15%',
      },
      {
        title: 'Change Type',
        render: (row: RequirementChange) => (
          <Chip
            label={row.changeType}
            size="small"
            style={{
              backgroundColor: CHANGE_COLORS[row.changeType],
              color: NEXORA_STATUS.onAccent,
              fontWeight: 600,
            }}
          />
        ),
        width: '15%',
      },
      {
        title: 'Title',
        render: (row: RequirementChange) => {
          const v = row.currentVersion ?? row.previousVersion;
          return <Typography variant="body2">{v?.title ?? '—'}</Typography>;
        },
        width: '30%',
      },
      {
        title: 'Changed Fields',
        render: (row: RequirementChange) => (
          <Typography variant="body2" color="textSecondary">
            {row.changedFields?.length ? row.changedFields.join(', ') : '—'}
          </Typography>
        ),
        width: '25%',
      },
      {
        title: '',
        render: (row: RequirementChange) =>
          row.changeType === 'MODIFIED' ? (
            <Button
              size="small"
              color="primary"
              onClick={() =>
                setSelectedReqId(prev =>
                  prev === row.requirementId ? null : row.requirementId,
                )
              }
            >
              {selectedReqId === row.requirementId ? 'Hide' : 'Details'}
            </Button>
          ) : null,
        width: '15%',
      },
    ],
    [selectedReqId],
  );

  const selectedChange = useMemo(() => {
    if (!selectedReqId || !changeSet) return null;
    return changeSet.changes.find(c => c.requirementId === selectedReqId) ?? null;
  }, [selectedReqId, changeSet]);

  if (loading) {
    return (
      <Page themeId="tool">
        <Header title="Baseline Change Set" />
        <Content>
          <Progress />
        </Content>
      </Page>
    );
  }

  if (error || !changeSet) {
    return (
      <Page themeId="tool">
        <Header title="Baseline Change Set" />
        <Content>
          <Typography color="error">{error || 'Change set not found'}</Typography>
          <Box marginTop={2}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
              Back
            </Button>
          </Box>
        </Content>
      </Page>
    );
  }

  const subtitle = `${changeSet.previousBaselineVersion ?? '(initial)'} → ${changeSet.baselineVersion}`;

  return (
    <Page themeId="tool">
      <Header title="Baseline Change Set" subtitle={subtitle} />
      <Content>
        <Box marginBottom={2} display="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button
            color="primary"
            variant="contained"
            startIcon={<AssignmentIcon />}
            onClick={() => {
              const params = new URLSearchParams();
              if (id) params.set('baselineId', id);
              if (changeSet.baselineVersion) {
                params.set('baselineVersion', changeSet.baselineVersion);
              }
              navigate(
                `/urs-composer/change-requests/new?${params.toString()}`,
              );
            }}
          >
            Raise Change Request
          </Button>
        </Box>

        <Box marginBottom={3}>
          <Typography variant="h6" gutterBottom>
            Impact overview
          </Typography>
          <ImpactGraph changeSet={changeSet} />
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={2} style={{ marginBottom: 24 }}>
          {(
            [
              { label: 'Added', key: 'added', color: CHANGE_COLORS.ADDED },
              { label: 'Modified', key: 'modified', color: CHANGE_COLORS.MODIFIED },
              { label: 'Removed', key: 'removed', color: CHANGE_COLORS.REMOVED },
              { label: 'Unchanged', key: 'unchanged', color: CHANGE_COLORS.UNCHANGED },
            ] as const
          ).map(item => (
            <Grid item xs={3} key={item.key}>
              <Card style={{ borderLeft: `4px solid ${item.color}` }}>
                <CardContent>
                  <Typography variant="h4" style={{ color: item.color }}>
                    {changeSet.summary[item.key]}
                  </Typography>
                  <Typography variant="subtitle2" color="textSecondary">
                    {item.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Filter Chips */}
        <Box style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          {FILTER_OPTIONS.map(opt => (
            <Chip
              key={opt.value}
              label={opt.label}
              size="small"
              color={filterType === opt.value ? 'primary' : 'default'}
              variant={filterType === opt.value ? 'default' : 'outlined'}
              onClick={() => setFilterType(opt.value)}
            />
          ))}
        </Box>

        {/* Changes Table */}
        <Table
          data={filteredChanges}
          columns={columns}
          options={{ paging: true, pageSize: 25, search: false }}
          title={`${filteredChanges.length} changes`}
        />

        {/* Detail Panel for MODIFIED items */}
        {selectedChange && selectedChange.previousVersion && selectedChange.currentVersion && (
          <Box marginTop={3}>
            <Typography variant="h6" gutterBottom>
              Changes for {selectedChange.requirementId}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Previous ({changeSet.previousBaselineVersion})
                    </Typography>
                    {(selectedChange.changedFields ?? []).map(field => (
                      <Box key={field} marginBottom={1}>
                        <Typography variant="caption" color="textSecondary">
                          {field}
                        </Typography>
                        <Typography variant="body2">
                          {String(
                            (selectedChange.previousVersion as unknown as Record<string, unknown>)[
                              field
                            ] ?? '—',
                          )}
                        </Typography>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Current ({changeSet.baselineVersion})
                    </Typography>
                    {(selectedChange.changedFields ?? []).map(field => (
                      <Box key={field} marginBottom={1}>
                        <Typography variant="caption" color="textSecondary">
                          {field}
                        </Typography>
                        <Typography variant="body2">
                          {String(
                            (selectedChange.currentVersion as unknown as Record<string, unknown>)[
                              field
                            ] ?? '—',
                          )}
                        </Typography>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Content>
    </Page>
  );
};
