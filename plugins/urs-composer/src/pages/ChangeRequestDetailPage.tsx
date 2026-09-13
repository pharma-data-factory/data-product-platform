/**
 * Change Request detail — view, assess impact, approve (PIN), or reject.
 */

import { useCallback, useEffect, useState, type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '@backstage/core-plugin-api';
import {
  Header,
  Page,
  Content,
  Progress,
  ErrorPanel,
} from '@backstage/core-components';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  TextField,
  Typography,
} from '@material-ui/core';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import { NEXORA_STATUS } from '@internal/plugin-nexora-common';
import { ursComposerApiRef } from '../api/ursComposerApi';
import {
  ChangeRequest,
  ChangeRequestStatus,
  ImpactAssessment,
  SignatureMeaning,
} from '../api/types';
import { ESignatureDialog } from '../components/ESignatureDialog/ESignatureDialog';

const STATUS_COLORS: Record<ChangeRequestStatus, string> = {
  [ChangeRequestStatus.DRAFT]: NEXORA_STATUS.pending,
  [ChangeRequestStatus.ASSESSED]: NEXORA_STATUS.warning,
  [ChangeRequestStatus.APPROVED]: NEXORA_STATUS.success,
  [ChangeRequestStatus.REJECTED]: NEXORA_STATUS.error,
};

export const ChangeRequestDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useApi(ursComposerApiRef);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [changeRequest, setChangeRequest] = useState<ChangeRequest | null>(
    null,
  );
  const [assessment, setAssessment] = useState<ImpactAssessment | null>(null);

  const [summary, setSummary] = useState('');
  const [gxpImpact, setGxpImpact] = useState(false);
  const [validationImpact, setValidationImpact] = useState('');
  const [affectedVersionIdsRaw, setAffectedVersionIdsRaw] = useState('');
  const [assessing, setAssessing] = useState(false);

  const [signOpen, setSignOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const cr = await api.getChangeRequest(id);
      setChangeRequest(cr);
      try {
        const trace = await api.getChangeRequestTraceability(id);
        setAssessment(trace.assessment);
      } catch {
        setAssessment(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setChangeRequest(null);
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAssess = async () => {
    if (!id || !summary.trim() || !validationImpact.trim()) return;
    setAssessing(true);
    setError(null);
    setActionNotice(null);
    try {
      const affectedVersionIds = affectedVersionIdsRaw
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
      const result = await api.assessChangeRequest(id, {
        summary: summary.trim(),
        gxpImpact,
        validationImpact: validationImpact.trim(),
        ...(affectedVersionIds.length ? { affectedVersionIds } : {}),
      });
      setAssessment(result);
      setActionNotice('Impact assessment recorded.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setAssessing(false);
    }
  };

  const handleApprove = async (input: { pin: string; comment?: string }) => {
    if (!id) return;
    await api.approveChangeRequest(id, input.pin, input.comment);
    setSignOpen(false);
    setActionNotice('Change request approved.');
    await load();
  };

  const handleReject = async () => {
    if (!id || !rejectReason.trim()) return;
    setRejecting(true);
    setError(null);
    try {
      await api.rejectChangeRequest(id, rejectReason.trim());
      setRejectOpen(false);
      setRejectReason('');
      setActionNotice('Change request rejected.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <Page themeId="tool">
        <Header title="Change Request" />
        <Content>
          <Progress />
        </Content>
      </Page>
    );
  }

  if (error && !changeRequest) {
    return (
      <Page themeId="tool">
        <Header title="Change Request" />
        <Content>
          <ErrorPanel error={error} />
          <Box marginTop={2}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/urs-composer/change-requests')}
            >
              Back to list
            </Button>
          </Box>
        </Content>
      </Page>
    );
  }

  if (!changeRequest) {
    return (
      <Page themeId="tool">
        <Header title="Change Request" />
        <Content>
          <Typography color="error">Change request not found</Typography>
        </Content>
      </Page>
    );
  }

  const isDraft = changeRequest.status === ChangeRequestStatus.DRAFT;
  const isAssessed = changeRequest.status === ChangeRequestStatus.ASSESSED;
  const canReject = isDraft || isAssessed;

  return (
    <Page themeId="tool">
      <Header
        title={changeRequest.title}
        subtitle={`Change request ${changeRequest.id}`}
      />
      <Content>
        <Box
          marginBottom={2}
          display="flex"
          alignItems="center"
          style={{ gap: 8, flexWrap: 'wrap' }}
        >
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/urs-composer/change-requests')}
          >
            Back to list
          </Button>
          <Chip
            label={changeRequest.status}
            size="small"
            style={{
              backgroundColor:
                STATUS_COLORS[changeRequest.status] ?? NEXORA_STATUS.pending,
              color: NEXORA_STATUS.onAccent,
              fontWeight: 600,
            }}
          />
          {isAssessed && (
            <Button
              color="primary"
              variant="contained"
              onClick={() => setSignOpen(true)}
            >
              Approve
            </Button>
          )}
          {canReject && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setRejectOpen(true)}
            >
              Reject
            </Button>
          )}
        </Box>

        {error && (
          <Box marginBottom={2}>
            <ErrorPanel error={error} />
          </Box>
        )}
        {actionNotice && (
          <Typography color="primary" paragraph>
            {actionNotice}
          </Typography>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Details
                </Typography>
                <Typography variant="subtitle2" color="textSecondary">
                  Description
                </Typography>
                <Typography paragraph style={{ whiteSpace: 'pre-wrap' }}>
                  {changeRequest.description}
                </Typography>
                <Typography variant="subtitle2" color="textSecondary">
                  Reason
                </Typography>
                <Typography paragraph style={{ whiteSpace: 'pre-wrap' }}>
                  {changeRequest.reason}
                </Typography>
                <Typography variant="subtitle2" color="textSecondary">
                  Affected requirement IDs
                </Typography>
                <Typography paragraph>
                  {changeRequest.affectedRequirementIds?.length
                    ? changeRequest.affectedRequirementIds.join(', ')
                    : '—'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Requested by {changeRequest.requestedBy} at{' '}
                  {new Date(changeRequest.requestedAt).toLocaleString()}
                </Typography>
                {changeRequest.decidedBy && (
                  <Typography variant="body2" color="textSecondary">
                    Decided by {changeRequest.decidedBy}
                    {changeRequest.decidedAt
                      ? ` at ${new Date(changeRequest.decidedAt).toLocaleString()}`
                      : ''}
                    {changeRequest.decisionReason
                      ? ` — ${changeRequest.decisionReason}`
                      : ''}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            {assessment && (
              <Card variant="outlined" style={{ marginBottom: 16 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Impact assessment
                  </Typography>
                  <Typography variant="subtitle2" color="textSecondary">
                    Summary
                  </Typography>
                  <Typography paragraph>{assessment.summary}</Typography>
                  <Typography variant="body2">
                    GxP impact flag: {assessment.gxpImpact ? 'Yes' : 'No'}
                  </Typography>
                  <Typography variant="subtitle2" color="textSecondary">
                    Validation impact
                  </Typography>
                  <Typography paragraph>
                    {assessment.validationImpact}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Assessed by {assessment.assessedBy} at{' '}
                    {new Date(assessment.assessedAt).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {isDraft && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Record impact assessment
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    An impact assessment is required before approval can
                    proceed.
                  </Typography>
                  <TextField
                    label="Summary"
                    value={summary}
                    onChange={e => setSummary(e.target.value)}
                    fullWidth
                    required
                    multiline
                    minRows={2}
                    margin="normal"
                    variant="outlined"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={gxpImpact}
                        onChange={e => setGxpImpact(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="GxP impact flagged"
                  />
                  <TextField
                    label="Validation impact"
                    value={validationImpact}
                    onChange={e => setValidationImpact(e.target.value)}
                    fullWidth
                    required
                    multiline
                    minRows={2}
                    margin="normal"
                    variant="outlined"
                  />
                  <TextField
                    label="Affected version IDs (optional)"
                    value={affectedVersionIdsRaw}
                    onChange={e => setAffectedVersionIdsRaw(e.target.value)}
                    fullWidth
                    multiline
                    minRows={2}
                    margin="normal"
                    variant="outlined"
                    helperText="Comma- or newline-separated version identifiers."
                  />
                  {assessing && <Progress />}
                  <Box marginTop={1}>
                    <Button
                      color="primary"
                      variant="contained"
                      disabled={
                        assessing ||
                        !summary.trim() ||
                        !validationImpact.trim()
                      }
                      onClick={handleAssess}
                    >
                      Submit assessment
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>

        <ESignatureDialog
          open={signOpen}
          meaning={SignatureMeaning.APPROVED_QA}
          subject={`Change request ${changeRequest.id}`}
          onConfirm={handleApprove}
          onClose={() => setSignOpen(false)}
        />

        <Dialog
          open={rejectOpen}
          onClose={() => !rejecting && setRejectOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Reject change request</DialogTitle>
          <DialogContent>
            <TextField
              label="Rejection reason"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              fullWidth
              required
              multiline
              minRows={3}
              margin="normal"
              variant="outlined"
              inputProps={{ 'aria-label': 'Rejection reason' }}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setRejectOpen(false)}
              disabled={rejecting}
            >
              Cancel
            </Button>
            <Button
              color="secondary"
              variant="contained"
              disabled={rejecting || !rejectReason.trim()}
              onClick={handleReject}
            >
              {rejecting ? 'Rejecting…' : 'Reject'}
            </Button>
          </DialogActions>
        </Dialog>
      </Content>
    </Page>
  );
};
