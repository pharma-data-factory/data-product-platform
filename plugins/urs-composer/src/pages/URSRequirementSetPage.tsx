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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Collapse,
} from '@material-ui/core';
import EditIcon from '@material-ui/icons/Edit';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import HistoryIcon from '@material-ui/icons/History';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import { usePermission } from '@backstage/plugin-permission-react';
import { ursApprovePermission, ursManagePermission } from '@internal/platform-common';
import { ursComposerApiRef } from '../api/ursComposerApi';
import {
  RequirementSet,
  Requirement,
  AuditEvent,
  ApprovalRecord,
  Baseline,
  URSStatus,
  RequirementVersion,
  ApprovalInstance,
  ApprovalStepInstance,
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
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [validating, setValidating] = useState(false);
  const [validationContextId, setValidationContextId] = useState<string | null>(
    null,
  );
  // Version History state
  const [versionHistory, setVersionHistory] = useState<Record<string, RequirementVersion[]>>({});
  const [expandedReqId, setExpandedReqId] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<RequirementVersion | null>(null);
  // Revision dialog state
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionTargetId, setRevisionTargetId] = useState<string | null>(null);
  const [revisionReason, setRevisionReason] = useState('');
  // Approval Instance state
  const [approvalInstance, setApprovalInstance] = useState<ApprovalInstance | null>(null);
  const [stepComment, setStepComment] = useState('');
  const [stepRejectReason, setStepRejectReason] = useState('');

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
          setBaselines(baselines);
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

  const handleToggleVersionHistory = async (reqId: string) => {
    if (expandedReqId === reqId) {
      setExpandedReqId(null);
      setSelectedVersion(null);
      return;
    }
    setExpandedReqId(reqId);
    if (!versionHistory[reqId]) {
      try {
        const versions = await api.listRequirementVersions(reqId);
        setVersionHistory(prev => ({ ...prev, [reqId]: versions }));
      } catch {
        // ignore — requirement may not have versions yet
      }
    }
  };

  const handleCreateRevision = async () => {
    if (!revisionTargetId || !revisionReason.trim()) {
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      await api.createRevision(revisionTargetId, { revisionReason: revisionReason.trim() });
      setRevisionDialogOpen(false);
      setRevisionReason('');
      setRevisionTargetId(null);
      if (expandedReqId) {
        const versions = await api.listRequirementVersions(expandedReqId);
        setVersionHistory(prev => ({ ...prev, [expandedReqId]: versions }));
      }
      await reload();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create revision');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitBaseline = async (baselineId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const instance = await api.submitBaseline(baselineId);
      setApprovalInstance(instance);
      await reload();
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit baseline');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveStep = async (stepId: string) => {
    if (!approvalInstance) {
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await api.approveStep(approvalInstance.id, stepId, {
        comment: stepComment || undefined,
      });
      setApprovalInstance(updated);
      setStepComment('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve step');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectStep = async (stepId: string) => {
    if (!approvalInstance || !stepRejectReason.trim()) {
      setActionError('Rejection reason is required');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await api.rejectStep(approvalInstance.id, stepId, {
        reason: stepRejectReason.trim(),
      });
      setApprovalInstance(updated);
      setStepRejectReason('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject step');
    } finally {
      setActionLoading(false);
    }
  };

  // Load approval instance when a baseline has one
  useEffect(() => {
    const baselineWithApproval = baselines.find(
      b => (b as any).approvalInstanceId,
    );
    if (baselineWithApproval && (baselineWithApproval as any).approvalInstanceId) {
      api
        .getApprovalInstance((baselineWithApproval as any).approvalInstanceId)
        .then(setApprovalInstance)
        .catch(() => {});
    }
  }, [baselines, api]);

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
                const isExpanded = expandedReqId === req.id;
                const versions = versionHistory[req.id];
                return (
                  <Card key={req.id} style={{ marginBottom: 12 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box flex={1}>
                          <Typography variant="h6">{req.title}</Typography>
                          <Typography paragraph>{req.statement}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {req.category || 'Uncategorized'} · {req.priority || '—'}
                          </Typography>
                        </Box>
                        {req.id && (
                          <IconButton
                            size="small"
                            onClick={() => handleToggleVersionHistory(req.id)}
                            title="Version History"
                          >
                            {isExpanded ? <ExpandLessIcon /> : <HistoryIcon />}
                          </IconButton>
                        )}
                      </Box>
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
                      {req.id && (
                        <Collapse in={isExpanded}>
                          <Divider style={{ margin: '12px 0' }} />
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2">Version History</Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setRevisionTargetId(req.id);
                                setRevisionDialogOpen(true);
                              }}
                            >
                              New Revision
                            </Button>
                          </Box>
                          {!versions || versions.length === 0 ? (
                            <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
                              No versions recorded yet.
                            </Typography>
                          ) : (
                            <List dense>
                              {versions.map(v => (
                                <ListItem
                                  key={v.id}
                                  button
                                  selected={selectedVersion?.id === v.id}
                                  onClick={() => setSelectedVersion(v)}
                                >
                                  <ListItemText
                                    primary={`v${v.version || v.versionNumber} — ${v.status}`}
                                    secondary={`${v.createdAt} · ${v.createdBy}`}
                                  />
                                  <Chip label={v.priority} size="small" variant="outlined" />
                                </ListItem>
                              ))}
                            </List>
                          )}
                          {selectedVersion && (
                            <Card variant="outlined" style={{ marginTop: 8, padding: 12 }}>
                              <Typography variant="subtitle2">
                                {selectedVersion.title || 'Requirement'} (v{selectedVersion.version || selectedVersion.versionNumber})
                              </Typography>
                              <Typography variant="body2" paragraph>
                                {selectedVersion.statement}
                              </Typography>
                              {selectedVersion.rationale && (
                                <Typography variant="body2" color="textSecondary">
                                  Rationale: {selectedVersion.rationale}
                                </Typography>
                              )}
                            </Card>
                          )}
                        </Collapse>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}

            {/* Revision Dialog */}
            <Dialog
              open={revisionDialogOpen}
              onClose={() => setRevisionDialogOpen(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>Create New Revision</DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  label="Revision Reason"
                  placeholder="Why is this revision needed?"
                  fullWidth
                  multiline
                  rows={3}
                  value={revisionReason}
                  onChange={e => setRevisionReason(e.target.value)}
                  style={{ marginTop: 8 }}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setRevisionDialogOpen(false)}>Cancel</Button>
                <Button
                  color="primary"
                  variant="contained"
                  disabled={!revisionReason.trim() || actionLoading}
                  onClick={handleCreateRevision}
                >
                  Create Revision
                </Button>
              </DialogActions>
            </Dialog>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2">Current State</Typography>
                <Typography paragraph>{set.status}</Typography>

                {/* P1B Approval Instance Display */}
                {approvalInstance ? (
                  <Box style={{ marginTop: 16 }}>
                    <Typography variant="h6" gutterBottom>Approval Workflow</Typography>
                    <Typography variant="body2" color="textSecondary" paragraph>
                      Status: {approvalInstance.status} · Started by {approvalInstance.startedBy || approvalInstance.createdBy}
                    </Typography>
                    <List>
                      {approvalInstance.steps.map((step: ApprovalStepInstance) => {
                        const stepStatus = String(step.status);
                        const isActive = stepStatus === 'ACTIVE';
                        const statusColor =
                          stepStatus === 'APPROVED' ? '#4caf50' :
                          stepStatus === 'REJECTED' ? '#f44336' :
                          stepStatus === 'ACTIVE' ? '#2196f3' :
                          stepStatus === 'SKIPPED' ? '#ff9800' : '#9e9e9e';
                        return (
                          <ListItem key={step.id} style={{ borderLeft: `3px solid ${statusColor}`, paddingLeft: 12 }}>
                            <ListItemText
                              primary={
                                <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                                  <Typography variant="subtitle2">
                                    Step {step.sequence ?? '?'}: {step.role || 'Reviewer'}
                                  </Typography>
                                  <Chip label={stepStatus} size="small" style={{ backgroundColor: statusColor, color: '#fff' }} />
                                </Box>
                              }
                              secondary={
                                step.approvedBy
                                  ? `${step.approvedBy} · ${step.approvedAt || ''}${step.comment ? ` · "${step.comment}"` : ''}`
                                  : step.rejectionReason
                                    ? `Rejected: ${step.rejectionReason}`
                                    : undefined
                              }
                            />
                            {isActive && !approveAllowed.loading && approveAllowed.allowed && (
                              <Box display="flex" alignItems="center" style={{ gap: 4 }}>
                                <TextField
                                  placeholder="Comment (optional)"
                                  size="small"
                                  value={stepComment}
                                  onChange={e => setStepComment(e.target.value)}
                                  style={{ width: 160 }}
                                />
                                <IconButton
                                  size="small"
                                  onClick={() => handleApproveStep(step.id)}
                                  disabled={actionLoading}
                                  title="Approve"
                                  style={{ color: '#4caf50' }}
                                >
                                  <CheckIcon />
                                </IconButton>
                                <TextField
                                  placeholder="Reason (required)"
                                  size="small"
                                  value={stepRejectReason}
                                  onChange={e => setStepRejectReason(e.target.value)}
                                  style={{ width: 160 }}
                                />
                                <IconButton
                                  size="small"
                                  onClick={() => handleRejectStep(step.id)}
                                  disabled={actionLoading || !stepRejectReason.trim()}
                                  title="Reject"
                                  style={{ color: '#f44336' }}
                                >
                                  <CloseIcon />
                                </IconButton>
                              </Box>
                            )}
                          </ListItem>
                        );
                      })}
                    </List>
                  </Box>
                ) : (
                  <>
                    {/* Fallback: Old-style approval records */}
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
                        No approval workflow active. Submit a baseline to start the approval process.
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
                  </>
                )}

                {/* Baseline Submission */}
                {baselines.length > 0 && !approvalInstance && manageAllowed.allowed && (
                  <Box style={{ marginTop: 16 }}>
                    <Divider style={{ marginBottom: 12 }} />
                    <Typography variant="subtitle2" gutterBottom>Baselines</Typography>
                    {baselines.map(b => (
                      <Box key={b.id} display="flex" alignItems="center" style={{ gap: 8, marginBottom: 8 }}>
                        <Typography variant="body2">
                          v{b.baselineVersion} — {b.status}
                        </Typography>
                        {String(b.status).toUpperCase() !== 'APPROVED' && !(b as any).approvalInstanceId && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            disabled={actionLoading}
                            onClick={() => handleSubmitBaseline(b.id)}
                          >
                            Submit for Approval
                          </Button>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}

                {/* URS → Validation Expert integration */}
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
                {baselines.length > 1 && (
                  <Box style={{ marginTop: 24 }}>
                    <Divider style={{ marginBottom: 16 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Baseline Change Sets
                    </Typography>
                    <List dense>
                      {baselines.slice(1).map(b => (
                        <ListItem key={b.id}>
                          <ListItemText
                            primary={`v${b.baselineVersion}`}
                            secondary={`${b.createdAt} · ${b.createdBy}`}
                          />
                          <Button
                            size="small"
                            onClick={() =>
                              navigate(`/urs-composer/baselines/${b.id}/changes`)
                            }
                          >
                            View Changes
                          </Button>
                        </ListItem>
                      ))}
                    </List>
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
