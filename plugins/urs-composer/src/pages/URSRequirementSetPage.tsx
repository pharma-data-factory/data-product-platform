/**
 * URS Requirement Set Detail Page
 */

import { useEffect, useState, useMemo, type FC, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '@backstage/core-plugin-api';
import {
  Header,
  Page,
  Content,
  ContentHeader,
  Progress,
  Link,
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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Collapse,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  MenuItem,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import EditIcon from '@material-ui/icons/Edit';
import AddIcon from '@material-ui/icons/Add';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import CancelIcon from '@material-ui/icons/Cancel';
import HistoryIcon from '@material-ui/icons/History';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import { usePermission } from '@backstage/plugin-permission-react';
import {
  NEXORA_SECURITY_FG,
  NEXORA_STATUS,
  NEXORA_TONE,
  StatusBadge,
} from '@internal/plugin-nexora-common';
import { ursApprovePermission, ursManagePermission, formatJourneyError, isUnauthorizedError } from '@internal/platform-common';
import { ursComposerApiRef } from '../api/ursComposerApi';
import {
  RequirementSet,
  Requirement,
  AuditEvent,
  Baseline,
  URSStatus,
  RequirementVersion,
  ApprovalInstance,
  ApprovalStepInstance,
  SignatureMeaning,
} from '../api/types';
import { parseAcceptanceCriteria } from '../components/CreateWizard/wizardState';
import { ESignatureDialog } from '../components/ESignatureDialog/ESignatureDialog';
import { SigningPinDialog } from '../components/SigningPinDialog/SigningPinDialog';
import { TraceMap } from '../components/TraceMap/TraceMap';
import { RequirementInlineEditor } from '../components/RequirementInlineEditor/RequirementInlineEditor';

interface TabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
}

function approvalStepIcon(
  isApproved: boolean,
  isRejected: boolean,
  isSkipped: boolean,
) {
  if (isApproved) {
    return <CheckIcon style={{ color: NEXORA_STATUS.passBg }} />;
  }
  if (isRejected) {
    return <CloseIcon style={{ color: NEXORA_STATUS.failBg }} />;
  }
  if (isSkipped) {
    return <CancelIcon style={{ color: NEXORA_STATUS.warnFg }} />;
  }
  return undefined;
}

function approvalStepColor(
  isActive: boolean,
  isApproved: boolean,
  isRejected: boolean,
  isSkipped: boolean,
) {
  // Used both as a text colour (step label) and as a chip background under
  // white text, so every value here has to be readable in both directions.
  // Brand cyan and brand orange are not — their *_FG counterparts are.
  if (isActive) {
    return NEXORA_TONE.active.bg;
  }
  if (isApproved) {
    return NEXORA_TONE.success.bg;
  }
  if (isRejected) {
    return NEXORA_TONE.danger.bg;
  }
  if (isSkipped) {
    return NEXORA_SECURITY_FG;
  }
  return NEXORA_TONE.neutral.text;
}

function confirmDialogTitle(action: 'reject' | 'cancel' | null) {
  if (action === 'reject') {
    return 'Reject Step';
  }
  return 'Cancel Workflow';
}

function confirmDialogButtonLabel(
  actionLoading: boolean,
  action: 'reject' | 'cancel' | null,
) {
  if (actionLoading) {
    return 'Processing...';
  }
  if (action === 'reject') {
    return 'Reject';
  }
  return 'Cancel Workflow';
}

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );
}

export const URSRequirementSetPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useApi(ursComposerApiRef);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [set, setSet] = useState<RequirementSet | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
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
  // Requirements search/filter state
  const [reqSearch, setReqSearch] = useState('');
  const [reqCategoryFilter, setReqCategoryFilter] = useState<string>('');
  const [reqPriorityFilter, setReqPriorityFilter] = useState<string>('');
  // Revision dialog state
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionTargetId, setRevisionTargetId] = useState<string | null>(null);
  const [revisionReason, setRevisionReason] = useState('');
  // Approval Instance state
  const [approvalInstance, setApprovalInstance] = useState<ApprovalInstance | null>(null);
  const [stepComments, setStepComments] = useState<Record<string, string>>({});
  // Create Baseline dialog state
  const [baselineDialogOpen, setBaselineDialogOpen] = useState(false);
  const [baselineVersion, setBaselineVersion] = useState('1.0');
  const [creatingBaseline, setCreatingBaseline] = useState(false);
  const [baselineSuccess, setBaselineSuccess] = useState(false);
  const [stepRejectReasons, setStepRejectReasons] = useState<Record<string, string>>({});
  // Confirmation dialog state (reject / cancel only)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'reject' | 'cancel' | null>(null);
  const [confirmStepId, setConfirmStepId] = useState<string | null>(null);
  const [confirmReason, setConfirmReason] = useState('');
  // E-sign approve dialog
  const [eSignOpen, setESignOpen] = useState(false);
  const [eSignStepId, setESignStepId] = useState<string | null>(null);
  // Signing PIN enrollment
  const [signingPinOpen, setSigningPinOpen] = useState(false);
  // Inline requirement editor (draft only)
  const [inlineEditOpen, setInlineEditOpen] = useState(false);
  const [inlineEditReq, setInlineEditReq] = useState<Requirement | null>(null);
  // Capability name resolution
  const [capabilityNames, setCapabilityNames] = useState<Record<string, string>>({});
  // Controlled revision ("New Version") state
  const [reviseDialogOpen, setReviseDialogOpen] = useState(false);
  const [reviseReason, setReviseReason] = useState('');
  const [predecessor, setPredecessor] = useState<RequirementSet | null>(null);

  const filteredRequirements = useMemo(() => {
    const q = reqSearch.toLowerCase();
    return requirements.filter(r => {
      if (q && !r.title.toLowerCase().includes(q) && !r.statement.toLowerCase().includes(q)) return false;
      if (reqCategoryFilter && r.category !== reqCategoryFilter) return false;
      if (reqPriorityFilter && r.priority !== reqPriorityFilter) return false;
      return true;
    });
  }, [requirements, reqSearch, reqCategoryFilter, reqPriorityFilter]);

  const categoryOptions = useMemo(() => [...new Set(requirements.map(r => r.category).filter(Boolean))] as string[], [requirements]);
  const priorityOptions = useMemo(() => [...new Set(requirements.map(r => r.priority).filter(Boolean))] as string[], [requirements]);

  const setCapabilityNameMap = useMemo(() => {
    const refs = set?.businessCapabilityRefs || [];
    const map: Record<string, string> = {};
    for (const ref of refs) {
      map[ref] = capabilityNames[ref] || ref;
    }
    return map;
  }, [set?.businessCapabilityRefs, capabilityNames]);

  const traceRequirements = useMemo(
    () =>
      requirements.map(r => ({
        id: r.requirementId || r.id,
        title: r.title,
        acCount: parseAcceptanceCriteria(r.acceptanceIntent).length,
      })),
    [requirements],
  );

  const eSignStep = useMemo(
    () => approvalInstance?.steps.find(s => s.id === eSignStepId) ?? null,
    [approvalInstance, eSignStepId],
  );

  const approveAllowed = usePermission({ permission: ursApprovePermission });
  const manageAllowed = usePermission({ permission: ursManagePermission });

  useEffect(() => {
    if (!id) {
      return undefined;
    }
    let mounted = true;
    Promise.all([
      api.getRequirementSet(id),
      api.listRequirements(id),
      api.getRequirementSetAudit(id),
    ])
      .then(([requirementSet, reqs, auditEvents]) => {
        if (!mounted) {
          return;
        }
        setSet(requirementSet);
        setRequirements(reqs);
        setAudit(auditEvents);
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

  useEffect(() => {
    let mounted = true;
    api
      .listCapabilities()
      .then(result => {
        if (!mounted) {
          return;
        }
        const map: Record<string, string> = {};
        for (const cap of result.items) {
          map[cap.id] = cap.name;
        }
        setCapabilityNames(map);
      })
      .catch(() => {
        // capability catalog may be empty — fall back to raw IDs
      });
    return () => {
      mounted = false;
    };
  }, [api]);

  const reload = async () => {
    if (!id) {
      return;
    }
    const [requirementSet, reqs, auditEvents] = await Promise.all([
      api.getRequirementSet(id),
      api.listRequirements(id),
      api.getRequirementSetAudit(id),
    ]);
    setSet(requirementSet);
    setRequirements(reqs);
    setAudit(auditEvents);
  };

  // Load any approved baseline for this requirement set (entry gate for a
  // Validation Context). Backend remains authoritative.
  useEffect(() => {
    if (!id) {
      return undefined;
    }
    let mounted = true;
    api
      .listBaselines(id)
      .then(baselineItems => {
        if (mounted) {
          setBaselines(baselineItems);
          const approved = baselineItems.find(
            b => String(b.status).toUpperCase() === 'APPROVED',
          );
          setApprovedBaselineId(approved ? approved.id : null);
          if (approved) {
            api
              .findValidationContext(id, approved.id)
              .then(existing => {
                if (mounted && existing?.id) {
                  setValidationContextId(existing.id);
                }
              })
              .catch(() => {
                // optional restore
              });
          } else if (mounted) {
            setValidationContextId(null);
          }
        }
      })
      .catch(() => {
        // baselines may be unsupported/empty — not fatal
      });
    return () => {
      mounted = false;
    };
  }, [id, api]);

  // Resolve the predecessor version when this set is a revision.
  const supersedesRef = set?.supersedesRef;
  useEffect(() => {
    if (!supersedesRef) {
      setPredecessor(null);
      return undefined;
    }
    let mounted = true;
    api
      .getRequirementSet(supersedesRef)
      .then(previous => {
        if (mounted) {
          setPredecessor(previous);
        }
      })
      .catch(() => {
        // predecessor may be unavailable — not fatal
      });
    return () => {
      mounted = false;
    };
  }, [supersedesRef, api]);

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
      navigate(`/validation-expert/contexts/${encodeURIComponent(context.id)}`);
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

  const handleApproveStep = async (
    stepId: string,
    opts: { comment?: string; pin: string },
  ) => {
    if (!approvalInstance) {
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await api.approveStep(approvalInstance.id, stepId, {
        comment: opts.comment || stepComments[stepId] || undefined,
        pin: opts.pin,
      });
      setApprovalInstance(updated);
      setStepComments(prev => { const next = { ...prev }; delete next[stepId]; return next; });
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve step');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectStep = async (stepId: string, reasonOverride?: string) => {
    const reason = (reasonOverride ?? stepRejectReasons[stepId] ?? '').trim();
    if (!approvalInstance || !reason) {
      setActionError('Rejection reason is required');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await api.rejectStep(approvalInstance.id, stepId, {
        reason,
      });
      setApprovalInstance(updated);
      setStepRejectReasons(prev => { const next = { ...prev }; delete next[stepId]; return next; });
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject step');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelWorkflow = async () => {
    if (!approvalInstance) {
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await api.cancelApprovalInstance(approvalInstance.id);
      setApprovalInstance(updated);
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel workflow');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevise = async () => {
    if (!id || !reviseReason.trim()) {
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const revision = await api.reviseRequirementSet(id, reviseReason.trim());
      setReviseDialogOpen(false);
      setReviseReason('');
      setLoading(true);
      navigate(`/urs-composer/${revision.id}`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to create a new version');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportAuditCsv = () => {
    const header = 'eventType,actor,timestamp,reason';
    const rows = audit.map(event =>
      [
        escapeCsvCell(event.eventType || ''),
        escapeCsvCell(event.actor || ''),
        escapeCsvCell(event.timestamp || ''),
        escapeCsvCell(event.reason || ''),
      ].join(','),
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${set?.requirementSetId || 'requirement-set'}-audit.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  // Load approval instance when a baseline has one
  useEffect(() => {
    const baselineWithApproval = baselines.find(
      b => b.approvalInstanceId,
    );
    if (baselineWithApproval && baselineWithApproval.approvalInstanceId) {
      api
        .getApprovalInstance(baselineWithApproval.approvalInstanceId)
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
        <Header title={isUnauthorizedError(error) ? 'Unauthorized' : 'Unable to load Requirement Set'} />
        <Content>
          <Typography color="error">
            {error ? formatJourneyError(error) : 'Requirement set not found'}
          </Typography>
        </Content>
      </Page>
    );
  }

  const canEdit = set.status === URSStatus.DRAFT;
  const canRevise =
    manageAllowed &&
    set.status !== URSStatus.SUPERSEDED &&
    set.status !== URSStatus.RETIRED &&
    (set.status === URSStatus.APPROVED ||
      set.status === URSStatus.BASELINED ||
      Boolean(approvedBaselineId));

  return (
    <Page themeId="tool">
      <Header
        title={set.solutionName || set.requirementSetId}
        subtitle={`${set.requirementSetId} · v${set.versionNumber}`}
      />
      <Content>
        <ContentHeader title="Requirement Set Detail">
          <Box display="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={() => navigate('/urs-composer/change-requests')}>
              Change Requests
            </Button>
            <Button onClick={() => navigate('/urs-composer/portfolio')}>
              Portfolio
            </Button>
            <Button onClick={() => setSigningPinOpen(true)}>
              Set signing PIN
            </Button>
            {canRevise && (
              <Button
                startIcon={<AddIcon />}
                onClick={() => setReviseDialogOpen(true)}
              >
                New Version
              </Button>
            )}
            {canEdit && (
              <Button
                startIcon={<EditIcon />}
                onClick={() => navigate(`/urs-composer/${set.id}/edit`)}
              >
                Edit Draft
              </Button>
            )}
          </Box>
        </ContentHeader>

        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" style={{ gap: 8, marginBottom: 8 }}>
              <StatusBadge kind="urs" state={set.status} />
              <Chip label={`v${set.versionNumber}`} variant="outlined" />
              <Typography color="textSecondary">
                Created {set.createdBy} · {set.createdAt}
                {set.updatedAt ? ` · Updated ${set.updatedAt}` : ''}
              </Typography>
            </Box>
            {predecessor && (
              <Typography variant="body2" color="textSecondary">
                Revision of{' '}
                <Link to={`/urs-composer/${predecessor.id}`}>
                  {predecessor.requirementSetId} (v{predecessor.versionNumber})
                </Link>
                {set.versionComment ? ` — ${set.versionComment}` : ''}
              </Typography>
            )}
            {actionError && (
              <Typography color="error" paragraph>
                {actionError}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Box marginTop={3}>
          <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)}>
            <Tab label="Overview" />
            <Tab label="Requirements" />
            <Tab label="Traceability" />
            <Tab label="Workflow" />
            <Tab label="Activity" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2">Business Capability</Typography>
                {(set.businessCapabilityRefs || []).length === 0 ? (
                  <Typography paragraph>—</Typography>
                ) : (
                  <Box
                    display="flex"
                    style={{ gap: 8, flexWrap: 'wrap', marginBottom: 16 }}
                  >
                    {(set.businessCapabilityRefs || []).map(ref => (
                      <Chip
                        key={ref}
                        label={capabilityNames[ref] || ref}
                        size="small"
                        variant="outlined"
                        clickable
                        onClick={() => navigate('/urs-composer/capabilities')}
                      />
                    ))}
                  </Box>
                )}
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
              <>
                <Box display="flex" alignItems="center" style={{ gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <TextField
                    placeholder="Search requirements..."
                    size="small"
                    variant="outlined"
                    value={reqSearch}
                    onChange={e => setReqSearch(e.target.value)}
                    style={{ minWidth: 220 }}
                  />
                  {categoryOptions.length > 0 && (
                    <TextField
                      select
                      label="Category"
                      size="small"
                      variant="outlined"
                      value={reqCategoryFilter}
                      onChange={e => setReqCategoryFilter(e.target.value)}
                      style={{ minWidth: 140 }}
                    >
                      <MenuItem value="">All</MenuItem>
                      {categoryOptions.map(c => <MenuItem key={c} value={c!}>{c}</MenuItem>)}
                    </TextField>
                  )}
                  {priorityOptions.length > 0 && (
                    <TextField
                      select
                      label="Priority"
                      size="small"
                      variant="outlined"
                      value={reqPriorityFilter}
                      onChange={e => setReqPriorityFilter(e.target.value)}
                      style={{ minWidth: 120 }}
                    >
                      <MenuItem value="">All</MenuItem>
                      {priorityOptions.map(p => <MenuItem key={p} value={p!}>{p}</MenuItem>)}
                    </TextField>
                  )}
                  {(reqSearch || reqCategoryFilter || reqPriorityFilter) && (
                    <Typography variant="caption" color="textSecondary">
                      {filteredRequirements.length} of {requirements.length} shown
                    </Typography>
                  )}
                </Box>
                {filteredRequirements.length === 0 ? (
                  <Typography color="textSecondary">No requirements match your filters.</Typography>
                ) : (
              filteredRequirements.map(req => {
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
                        <Box display="flex" alignItems="center" style={{ gap: 4 }}>
                          {canEdit && (
                            <Button
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => {
                                setInlineEditReq(req);
                                setInlineEditOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          )}
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
              </>
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
            <TraceMap
              capabilityNames={setCapabilityNameMap}
              businessNeed={set.businessNeed}
              requirements={traceRequirements}
              solutionName={set.solutionName}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Alert severity="info" style={{ marginBottom: 16 }}>
              Approval steps require a signing PIN (technical workflow control).
              This is not a GxP or 21 CFR Part 11 compliance claim.
            </Alert>
            <Card>
              <CardContent>
                {/* A) Approval */}
                <Typography variant="h6" gutterBottom>
                  Approval
                </Typography>
                <Typography variant="subtitle2">Current State</Typography>
                <Typography paragraph>{set.status}</Typography>

                {approvalInstance ? (
                  <Box style={{ marginTop: 16 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Approval Workflow
                    </Typography>
                    <Typography variant="body2" color="textSecondary" paragraph>
                      Status: {approvalInstance.status} · Started by {approvalInstance.startedBy || approvalInstance.createdBy}
                    </Typography>
                    <Stepper
                      activeStep={approvalInstance.steps.findIndex((s: ApprovalStepInstance) => String(s.status) === 'ACTIVE')}
                      orientation="vertical"
                    >
                      {approvalInstance.steps.map((step: ApprovalStepInstance) => {
                        const stepStatus = String(step.status);
                        const isActive = stepStatus === 'ACTIVE';
                        const isApproved = stepStatus === 'APPROVED';
                        const isRejected = stepStatus === 'REJECTED';
                        const isSkipped = stepStatus === 'SKIPPED';
                        const completed = isApproved || isRejected || isSkipped;
                        return (
                          <Step key={step.id} completed={completed} active={isActive}>
                            <StepLabel
                              icon={approvalStepIcon(isApproved, isRejected, isSkipped)}
                              StepIconProps={{
                                style: {
                                  color: approvalStepColor(
                                    isActive,
                                    isApproved,
                                    isRejected,
                                    isSkipped,
                                  ),
                                },
                              }}
                            >
                              <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                                <Typography variant="subtitle2">
                                  {step.role || 'Reviewer'}
                                </Typography>
                                <Chip label={stepStatus} size="small" style={{
                                  backgroundColor: approvalStepColor(
                                    isActive,
                                    isApproved,
                                    isRejected,
                                    isSkipped,
                                  ),
                                  color: NEXORA_STATUS.passFg,
                                }} />
                              </Box>
                            </StepLabel>
                            <StepContent>
                              {step.actedBy && (
                                <Typography variant="body2" color="textSecondary" paragraph>
                                  {step.actedBy} · {step.actedAt || ''}{step.comment ? ` · "${step.comment}"` : ''}
                                </Typography>
                              )}
                              {isRejected && step.comment && (
                                <Typography variant="body2" color="error" paragraph>
                                  Rejected: {step.comment}
                                </Typography>
                              )}
                              {isActive && !approveAllowed.loading && approveAllowed.allowed && (
                                <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                      setESignStepId(step.id);
                                      setESignOpen(true);
                                    }}
                                    disabled={actionLoading}
                                    style={{ color: NEXORA_STATUS.passBg, borderColor: NEXORA_STATUS.passBg }}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                      setConfirmAction('reject');
                                      setConfirmStepId(step.id);
                                      setConfirmReason(stepRejectReasons[step.id] || '');
                                      setConfirmOpen(true);
                                    }}
                                    disabled={actionLoading}
                                    style={{ color: NEXORA_STATUS.failBg, borderColor: NEXORA_STATUS.failBg }}
                                  >
                                    Reject
                                  </Button>
                                </Box>
                              )}
                            </StepContent>
                          </Step>
                        );
                      })}
                    </Stepper>
                    {(String(approvalInstance.status) === 'NOT_STARTED' || String(approvalInstance.status) === 'IN_PROGRESS') && (
                      <Box style={{ marginTop: 12 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<CancelIcon />}
                          onClick={() => {
                            setConfirmAction('cancel');
                            setConfirmStepId(null);
                            setConfirmReason('');
                            setConfirmOpen(true);
                          }}
                          disabled={actionLoading}
                          style={{
                            color: NEXORA_SECURITY_FG,
                            borderColor: NEXORA_SECURITY_FG,
                          }}
                        >
                          Cancel Workflow
                        </Button>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography color="textSecondary" paragraph>
                    No approval workflow active. Create a baseline and submit it to start the approval process.
                  </Typography>
                )}

                {/* B) Baselines & change sets */}
                <Divider style={{ margin: '24px 0 16px' }} />
                <Typography variant="h6" gutterBottom>
                  Baselines &amp; change sets
                </Typography>

                {!approvalInstance && manageAllowed.allowed && requirements.length > 0 && (
                  <Box style={{ marginTop: 8 }}>
                    <Button
                      color="primary"
                      variant="contained"
                      onClick={() => {
                        const nextVersion = baselines.length > 0
                          ? `${parseInt(baselines[baselines.length - 1].baselineVersion || '1', 10) + 1}.0`
                          : '1.0';
                        setBaselineVersion(nextVersion);
                        setBaselineDialogOpen(true);
                      }}
                    >
                      Create Baseline
                    </Button>
                    <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginTop: 4 }}>
                      Snapshot {requirements.length} requirement(s) into a new baseline for approval.
                    </Typography>
                  </Box>
                )}

                {baselines.length > 0 && !approvalInstance && manageAllowed.allowed && (
                  <Box style={{ marginTop: 16 }}>
                    <Typography variant="subtitle2" gutterBottom>Baselines</Typography>
                    {baselines.map(b => (
                      <Box key={b.id} display="flex" alignItems="center" style={{ gap: 8, marginBottom: 8 }}>
                        <Typography variant="body2">
                          v{b.baselineVersion} — {b.status}
                        </Typography>
                        {String(b.status).toUpperCase() !== 'APPROVED' && !b.approvalInstanceId && (
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

                {baselines.length > 1 && (
                  <Box style={{ marginTop: 16 }}>
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

                {baselines.length === 0 && !approvalInstance && (
                  <Typography color="textSecondary" paragraph>
                    No baselines yet.
                  </Typography>
                )}

                {/* C) Validation handoff */}
                <Divider style={{ margin: '24px 0 16px' }} />
                <Typography variant="h6" gutterBottom>
                  Validation handoff
                </Typography>

                {approvedBaselineId && !validationContextId && (
                  <Box style={{ marginTop: 8 }}>
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
                  <Box style={{ marginTop: 8 }}>
                    <Button
                      color="primary"
                      variant="outlined"
                      onClick={() => {
                        navigate(
                          `/validation-expert/contexts/${encodeURIComponent(
                            validationContextId,
                          )}`,
                        );
                      }}
                    >
                      View Validation
                    </Button>
                  </Box>
                )}
                {!approvedBaselineId && !validationContextId && (
                  <Typography color="textSecondary">
                    Validation handoff becomes available after a baseline is approved.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel value={tabValue} index={4}>
            <Box display="flex" justifyContent="flex-end" style={{ marginBottom: 12 }}>
              <Button
                variant="outlined"
                size="small"
                disabled={audit.length === 0}
                onClick={handleExportAuditCsv}
              >
                Export audit (CSV)
              </Button>
            </Box>
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

      {/* E-signature for approve */}
      <ESignatureDialog
        open={eSignOpen}
        meaning={
          eSignStep?.role === 'QUALITY_REVIEWER'
            ? SignatureMeaning.APPROVED_QA
            : SignatureMeaning.REVIEWED
        }
        subject={`Baseline approval · ${eSignStep?.role || 'Reviewer'}`}
        onConfirm={async ({ pin, comment }) => {
          if (!eSignStepId) {
            return;
          }
          await handleApproveStep(eSignStepId, { pin, comment });
          setESignOpen(false);
          setESignStepId(null);
        }}
        onClose={() => {
          setESignOpen(false);
          setESignStepId(null);
        }}
      />

      <SigningPinDialog
        open={signingPinOpen}
        onClose={() => setSigningPinOpen(false)}
      />

      <RequirementInlineEditor
        open={inlineEditOpen}
        requirement={inlineEditReq}
        onClose={() => {
          setInlineEditOpen(false);
          setInlineEditReq(null);
        }}
        onSave={async (updated: {
          requirementId: string;
          id?: string;
          title: string;
          statement: string;
          rationale?: string;
          priority: Requirement['priority'];
          gxpRelevance?: Requirement['gxpRelevance'];
          acceptanceIntent?: string;
          category?: string;
          classification?: Requirement['classification'];
          source?: string;
          owner?: string;
        }) => {
          if (!id) {
            return;
          }
          const nextRequirements = requirements.map(r => {
            const isTarget =
              (updated.id && r.id === updated.id) ||
              (updated.requirementId && r.requirementId === updated.requirementId);
            if (isTarget) {
              return {
                id: updated.id ?? r.id,
                requirementId: updated.requirementId ?? r.requirementId,
                title: updated.title,
                statement: updated.statement,
                rationale: updated.rationale,
                priority: updated.priority,
                gxpRelevance: updated.gxpRelevance,
                acceptanceIntent: updated.acceptanceIntent,
                category: updated.category,
                classification: updated.classification,
                source: updated.source,
                owner: updated.owner,
              };
            }
            return {
              id: r.id,
              requirementId: r.requirementId,
              title: r.title,
              statement: r.statement,
              rationale: r.rationale,
              priority: r.priority,
              gxpRelevance: r.gxpRelevance,
              acceptanceIntent: r.acceptanceIntent,
              category: r.category,
              classification: r.classification,
              source: r.source,
              owner: r.owner,
            };
          });
          await api.updateRequirementSet(id, { requirements: nextRequirements });
          await reload();
        }}
      />

      {/* Reject / Cancel Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{confirmDialogTitle(confirmAction)}</DialogTitle>
        <DialogContent>
          {confirmAction === 'reject' && (
            <>
              <Typography variant="body2" color="textSecondary" paragraph>
                Confirm rejection for step <strong>{approvalInstance?.steps.find(s => s.id === confirmStepId)?.role}</strong>.
                A reason is required.
              </Typography>
              <TextField
                label="Rejection reason (required)"
                value={confirmReason}
                onChange={e => setConfirmReason(e.target.value)}
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                size="small"
                error={!confirmReason.trim()}
                helperText={!confirmReason.trim() ? 'Reason is required' : undefined}
              />
            </>
          )}
          {confirmAction === 'cancel' && (
            <Typography variant="body2" color="textSecondary">
              This will cancel the entire approval workflow. All pending steps will be skipped.
              This action cannot be undone.
            </Typography>
          )}
          {actionError && (
            <Typography color="error" variant="body2" style={{ marginTop: 8 }}>{actionError}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmOpen(false); setActionError(null); }} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            color="secondary"
            variant="contained"
            disabled={actionLoading || (confirmAction === 'reject' && !confirmReason.trim())}
            onClick={async () => {
              if (confirmAction === 'reject' && confirmStepId) {
                setStepRejectReasons(prev => ({ ...prev, [confirmStepId]: confirmReason }));
                await handleRejectStep(confirmStepId, confirmReason);
              } else if (confirmAction === 'cancel') {
                await handleCancelWorkflow();
              }
              if (!actionError) {
                setConfirmOpen(false);
                setConfirmReason('');
              }
            }}
          >
            {confirmDialogButtonLabel(actionLoading, confirmAction)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Baseline Dialog */}
      <Dialog open={baselineDialogOpen} onClose={() => setBaselineDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Baseline</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" paragraph>
            This will snapshot all current requirement versions into an immutable baseline.
          </Typography>
          <Box display="flex" alignItems="center" style={{ gap: 16, marginBottom: 12 }}>
            <TextField
              label="Baseline Version"
              value={baselineVersion}
              onChange={e => setBaselineVersion(e.target.value)}
              size="small"
              variant="outlined"
              style={{ width: 140 }}
            />
            <Typography variant="body2">
              {requirements.length} requirement(s) will be included
            </Typography>
          </Box>
          {actionError && (
            <Typography color="error" variant="body2">{actionError}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setBaselineDialogOpen(false); setActionError(null); }} disabled={creatingBaseline}>
            Cancel
          </Button>
          <Button
            color="primary"
            variant="contained"
            disabled={creatingBaseline || !baselineVersion.trim()}
            onClick={async () => {
              setCreatingBaseline(true);
              setActionError(null);
              try {
                const reqIds = requirements.map(r => r.id);
                await api.createBaseline(id!, {
                  requirementSetId: id!,
                  baselineVersion: baselineVersion.trim(),
                  requirementVersionIds: reqIds,
                });
                setBaselineDialogOpen(false);
                setBaselineSuccess(true);
                await reload();
              } catch (err: any) {
                setActionError(err.message || 'Failed to create baseline');
              } finally {
                setCreatingBaseline(false);
              }
            }}
          >
            {creatingBaseline ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Version (controlled revision) dialog */}
      <Dialog
        open={reviseDialogOpen}
        onClose={() => setReviseDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create a New Version</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            {set.requirementSetId} (v{set.versionNumber}) is approved and stays immutable. A new
            DRAFT version v{set.versionNumber + 1} is created with a copy of all requirements. The
            current version remains the effective record until the new one is approved.
          </Typography>
          <TextField
            label="Reason for change"
            fullWidth
            required
            multiline
            rows={3}
            value={reviseReason}
            onChange={e => setReviseReason(e.target.value)}
            helperText="Recorded in the audit trail."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviseDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRevise}
            disabled={!reviseReason.trim() || actionLoading}
          >
            {actionLoading ? 'Creating...' : 'Create New Version'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={baselineSuccess}
        autoHideDuration={4000}
        onClose={() => setBaselineSuccess(false)}
        message="Baseline created successfully"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      />
    </Page>
  );
};
