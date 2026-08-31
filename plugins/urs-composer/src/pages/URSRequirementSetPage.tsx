/**
 * URS Requirement Set Detail Page
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '@backstage/core-plugin-api';
import {
  Header,
  Page,
  Content,
  ContentHeader,
  Progress,
} from '@backstage/core-components';
import {
  Typography,
  Card,
  CardContent,
  Box,
  Tab,
  Tabs,
  Button,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@material-ui/core';
import EditIcon from '@material-ui/icons/Edit';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import { usePermission } from '@backstage/plugin-permission-react';
import { ursApprovePermission, ursManagePermission } from '@internal/platform-common';
import { ursComposerApiRef } from '../api/ursComposerApi';
import {
  RequirementSet,
  Requirement,
  AuditEvent,
  ApprovalRecord,
  URSStatus,
} from '../api/types';
import { parseAcceptanceCriteria } from '../components/CreateWizard/wizardState';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );
}

export const URSRequirementSetPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useApi(ursComposerApiRef);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [set, setSet] = useState<RequirementSet | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  // URS → Validation Expert integration
  const [approvedBaselineId, setApprovedBaselineId] = useState<string | null>(
    null,
  );
  const [validating, setValidating] = useState(false);
  const [validationContextId, setValidationContextId] = useState<string | null>(
    null,
  );

  const approveAllowed = usePermission({ permission: ursApprovePermission });
  const manageAllowed = usePermission({ permission: ursManagePermission });

  useEffect(() => {
    if (!id) {
      return;
    }
    let mounted = true;
    Promise.all([
      api.getRequirementSet(id),
      api.listRequirements(id),
      api.getRequirementSetAudit(id),
      api.getApprovals(id),
    ])
      .then(([requirementSet, reqs, auditEvents, approvalRecords]) => {
        if (!mounted) {
          return;
        }
        setSet(requirementSet);
        setRequirements(reqs);
        setAudit(auditEvents);
        setApprovals(approvalRecords);
      })
      .catch(err => {
        if (mounted) {
          setError(err.message || 'Failed to load requirement set');
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
  }, [id, api]);

  const reload = async () => {
    if (!id) {
      return;
    }
    const [requirementSet, reqs, auditEvents, approvalRecords] = await Promise.all([
      api.getRequirementSet(id),
      api.listRequirements(id),
      api.getRequirementSetAudit(id),
      api.getApprovals(id),
    ]);
    setSet(requirementSet);
    setRequirements(reqs);
    setAudit(auditEvents);
    setApprovals(approvalRecords);
  };

  const handleSubmit = async () => {
    if (!id) {
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      await api.submitRequirementSet(id);
      await reload();
    } catch (err: any) {
      setActionError(err.message || 'Submit failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id) {
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      await api.approveRequirementSet(id);
      await reload();
    } catch (err: any) {
      setActionError(err.message || 'Approval denied or failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id || !rejectReason.trim()) {
      setActionError('Rejection reason is required');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      await api.rejectRequirementSet(id, rejectReason.trim());
      await reload();
    } catch (err: any) {
      setActionError(err.message || 'Rejection denied or failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Load any approved baseline for this requirement set (entry gate for a
  // Validation Context). Backend remains authoritative.
  useEffect(() => {
    if (!id) {
      return;
    }
    let mounted = true;
    api
      .listBaselines(id)
      .then(baselines => {
        if (mounted) {
          const approved = baselines.find(
            b => String(b.status).toUpperCase() === 'APPROVED',
          );
          setApprovedBaselineId(approved ? approved.id : null);
        }
      })
      .catch(() => {
        // baselines may be unsupported/empty — not fatal
      });
    return () => {
      mounted = false;
    };
  }, [id, api]);

  const handleStartValidation = async () => {
    if (!id || !approvedBaselineId) {
      return;
    }
    setActionError(null);
    setValidating(true);
    try {
      const { context } = await api.startValidationFromBaseline(
        id,
        approvedBaselineId,
      );
      setValidationContextId(context.id);
      window.location.href = `/validation-expert`;
    } catch (err: any) {
      setActionError(err.message || 'Failed to start validation');
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <Page themeId="tool">
        <Header title="Requirement Set" />
        <Content>
          <Progress />
        </Content>
      </Page>
    );
  }

  if (error || !set) {
    return (
      <Page themeId="tool">
        <Header title="Requirement Set" />
        <Content>
          <Typography color="error">{error || 'Requirement set not found'}</Typography>
        </Content>
      </Page>
    );
  }

  const canEdit = set.status === URSStatus.DRAFT;
  const canSubmit =
    set.status === URSStatus.DRAFT &&
    !manageAllowed.loading &&
    manageAllowed.allowed === true;
  const canApprove =
    set.status === URSStatus.IN_REVIEW &&
    !approveAllowed.loading &&
    approveAllowed.allowed === true;

  return (
    <Page themeId="tool">
      <Header
        title={set.solutionName || set.requirementSetId}
        subtitle={set.requirementSetId}
      />
      <Content>
        <ContentHeader title="Requirement Set Detail">
          {canEdit && (
            <Button
              startIcon={<EditIcon />}
              onClick={() => navigate(`/urs-composer/${set.id}/edit`)}
            >
              Edit Draft
            </Button>
          )}
        </ContentHeader>

        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" style={{ gap: 8, marginBottom: 8 }}>
              <Chip label={set.status} color="primary" />
              <Typography color="textSecondary">
                Created {set.createdBy} · {set.createdAt}
                {set.updatedAt ? ` · Updated ${set.updatedAt}` : ''}
              </Typography>
            </Box>
            {actionError && (
              <Typography color="error" paragraph>
                {actionError}
              </Typography>
            )}
            {canSubmit && (
              <Button
                color="primary"
                variant="contained"
                disabled={actionLoading}
                onClick={handleSubmit}
              >
                Submit for Review
              </Button>
            )}
          </CardContent>
        </Card>

        <Box marginTop={3}>
          <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)}>
            <Tab label="Overview" />
            <Tab label="Requirements" />
            <Tab label="Workflow" />
            <Tab label="Activity" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2">Business Capability</Typography>
                <Typography paragraph>
                  {(set.businessCapabilityRefs || []).join(', ') || '—'}
                </Typography>
                <Typography variant="subtitle2">Business Need</Typography>
                <Typography paragraph>{set.businessNeed}</Typography>
                <Typography variant="subtitle2">Solution Context</Typography>
                <Typography paragraph>
                  {set.solutionType} · {set.solutionName}
                </Typography>
                <Typography variant="subtitle2">Regulatory Context</Typography>
                <Typography paragraph>
                  GxP: {set.gxpRelevance || '—'} · Patient impact:{' '}
                  {set.patientImpact ? 'Yes' : 'No'} · Data integrity:{' '}
                  {set.dataIntegrityImpact ? 'Yes' : 'No'}
                </Typography>
                <Typography variant="subtitle2">Scope</Typography>
                <Typography paragraph>{set.scope || '—'}</Typography>
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {requirements.length === 0 ? (
              <Typography color="textSecondary">No requirements persisted yet.</Typography>
            ) : (
              requirements.map(req => {
                const acceptanceCriteria = parseAcceptanceCriteria(req.acceptanceIntent);
                return (
                  <Card key={req.id} style={{ marginBottom: 12 }}>
                    <CardContent>
                      <Typography variant="h6">{req.title}</Typography>
                      <Typography paragraph>{req.statement}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {req.category || 'Uncategorized'} · {req.priority || '—'}
                      </Typography>
                      {acceptanceCriteria.length > 0 && (
                        <>
                          <Divider style={{ margin: '12px 0' }} />
                          <Typography variant="subtitle2">Acceptance Criteria</Typography>
                          <List dense>
                            {acceptanceCriteria.map(ac => (
                              <ListItem key={ac.tempId}>
                                <ListItemText primary={ac.title} secondary={ac.description} />
                              </ListItem>
                            ))}
                          </List>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2">Current State</Typography>
                <Typography paragraph>{set.status}</Typography>
                {approvals.length > 0 ? (
                  <List dense>
                    {approvals.map(record => (
                      <ListItem key={record.id}>
                        <ListItemText
                          primary={`${record.approvalRole}: ${record.status}`}
                          secondary={
                            record.approver
                              ? `${record.approver} · ${record.decidedAt || ''}`
                              : undefined
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="textSecondary" paragraph>
                    Approval gate details are tracked through requirement set status and
                    technical audit events.
                  </Typography>
                )}
                {canApprove && (
                  <Box display="flex" alignItems="center" style={{ gap: 8, marginTop: 16 }}>
                    <Button
                      color="primary"
                      variant="contained"
                      startIcon={<CheckIcon />}
                      disabled={actionLoading}
                      onClick={handleApprove}
                    >
                      Approve
                    </Button>
                    <TextField
                      label="Rejection reason"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      size="small"
                      style={{ minWidth: 280 }}
                    />
                    <Button
                      color="secondary"
                      variant="outlined"
                      startIcon={<CloseIcon />}
                      disabled={actionLoading}
                      onClick={handleReject}
                    >
                      Reject
                    </Button>
                  </Box>
                )}

                {/* URS → Validation Expert integration. Visibility is convenience;
                    the backend enforces the APPROVED-baseline entry gate. */}
                {approvedBaselineId && !validationContextId && (
                  <Box style={{ marginTop: 16 }}>
                    <Button
                      color="primary"
                      variant="contained"
                      startIcon={<CheckIcon />}
                      disabled={validating || actionLoading}
                      onClick={handleStartValidation}
                    >
                      {validating ? 'Starting…' : 'Start Validation'}
                    </Button>
                    <Typography variant="caption" color="textSecondary" style={{ marginLeft: 8 }}>
                      From approved baseline ({approvedBaselineId})
                    </Typography>
                  </Box>
                )}
                {validationContextId && (
                  <Box style={{ marginTop: 16 }}>
                    <Button
                      color="primary"
                      variant="outlined"
                      onClick={() => {
                        window.location.href = `/validation-expert`;
                      }}
                    >
                      View Validation
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            {audit.length === 0 ? (
              <Typography color="textSecondary">
                No technical audit events recorded for this requirement set yet.
              </Typography>
            ) : (
              <List dense>
                {audit.map(event => (
                  <ListItem key={event.id}>
                    <ListItemText
                      primary={`${event.eventType} · ${event.actor}`}
                      secondary={`${event.timestamp}${event.reason ? ` · ${event.reason}` : ''}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </TabPanel>
        </Box>
      </Content>
    </Page>
  );
};
