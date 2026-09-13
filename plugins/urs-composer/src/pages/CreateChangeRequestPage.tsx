/**
 * Create Change Request — capture title, description, reason, and optional
 * affected requirement identifiers.
 */

import { useMemo, useState, type FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  TextField,
  Typography,
} from '@material-ui/core';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import { ursComposerApiRef } from '../api/ursComposerApi';
import { buildCreateChangeRequestDefaults } from './changeRequestPrefill';

function parseAffectedIds(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

export const CreateChangeRequestPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const api = useApi(ursComposerApiRef);

  const defaults = useMemo(
    () =>
      buildCreateChangeRequestDefaults({
        baselineId: searchParams.get('baselineId'),
        baselineVersion: searchParams.get('baselineVersion'),
        reason: searchParams.get('reason'),
        productVersionId: searchParams.get('productVersionId'),
        productId: searchParams.get('productId'),
        successor: searchParams.get('successor'),
        affectedRequirementIds: searchParams.get('affectedRequirementIds'),
      }),
    [searchParams],
  );

  const [title, setTitle] = useState(defaults.title);
  const [description, setDescription] = useState(defaults.description);
  const [reason, setReason] = useState(defaults.reason);
  const [affectedIdsRaw, setAffectedIdsRaw] = useState(defaults.affectedIdsRaw);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    reason.trim().length > 0 &&
    !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const affectedRequirementIds = parseAffectedIds(affectedIdsRaw);
      const created = await api.createChangeRequest({
        title: title.trim(),
        description: description.trim(),
        reason: reason.trim(),
        ...(affectedRequirementIds.length
          ? { affectedRequirementIds }
          : {}),
      });
      navigate(`/urs-composer/change-requests/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setSubmitting(false);
    }
  };

  return (
    <Page themeId="tool">
      <Header
        title="Create Change Request"
        subtitle="Open a controlled change for requirement updates"
      />
      <Content>
        <Box marginBottom={2}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/urs-composer/change-requests')}
          >
            Back to list
          </Button>
        </Box>

        {error && (
          <Box marginBottom={2}>
            <ErrorPanel error={error} />
          </Box>
        )}

        <Typography variant="body2" color="textSecondary" paragraph>
          Provide a clear title, description, and reason. Optionally list
          requirement IDs that this change is expected to affect. Soft product
          or baseline references in the description are advisory breadcrumbs
          only — not GxP / Part 11 controlled product records.
        </Typography>

        <TextField
          label="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          fullWidth
          required
          margin="normal"
          variant="outlined"
          inputProps={{ 'aria-label': 'Title' }}
        />

        <TextField
          label="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          fullWidth
          required
          multiline
          minRows={3}
          margin="normal"
          variant="outlined"
          inputProps={{ 'aria-label': 'Description' }}
        />

        <TextField
          label="Reason"
          value={reason}
          onChange={e => setReason(e.target.value)}
          fullWidth
          required
          multiline
          minRows={2}
          margin="normal"
          variant="outlined"
          helperText="Why this change is needed."
          inputProps={{ 'aria-label': 'Reason' }}
        />

        <TextField
          label="Affected requirement IDs (optional)"
          value={affectedIdsRaw}
          onChange={e => setAffectedIdsRaw(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          margin="normal"
          variant="outlined"
          helperText="Comma- or newline-separated requirement identifiers."
          inputProps={{ 'aria-label': 'Affected requirement IDs' }}
        />

        {submitting && <Progress />}

        <Box marginTop={2} display="flex" style={{ gap: 8 }}>
          <Button
            color="primary"
            variant="contained"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            Create change request
          </Button>
          <Button
            onClick={() => navigate('/urs-composer/change-requests')}
            disabled={submitting}
          >
            Cancel
          </Button>
        </Box>
      </Content>
    </Page>
  );
};
