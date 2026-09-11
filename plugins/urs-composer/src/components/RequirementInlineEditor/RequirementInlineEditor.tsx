import { useEffect, useState, type FC } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@material-ui/core';
import {
  GxPRelevance,
  Requirement,
  RequirementPriority,
} from '../../api/types';

export interface RequirementInlineEditorProps {
  open: boolean;
  requirement: Requirement | null;
  onClose: () => void;
  onSave: (updated: {
    requirementId: string;
    id?: string;
    title: string;
    statement: string;
    rationale?: string;
    priority: RequirementPriority;
    gxpRelevance?: GxPRelevance;
    acceptanceIntent?: string;
    category?: string;
    classification?: Requirement['classification'];
    source?: string;
    owner?: string;
  }) => Promise<void>;
}

/**
 * Edit a single DRAFT requirement without re-entering the create wizard.
 */
export const RequirementInlineEditor: FC<RequirementInlineEditorProps> = ({
  open,
  requirement,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [rationale, setRationale] = useState('');
  const [priority, setPriority] = useState<RequirementPriority>(
    RequirementPriority.MUST,
  );
  const [gxpRelevance, setGxpRelevance] = useState<GxPRelevance>(
    GxPRelevance.NONE,
  );
  const [acceptanceIntent, setAcceptanceIntent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !requirement) {
      return;
    }
    setTitle(requirement.title ?? '');
    setStatement(requirement.statement ?? '');
    setRationale(requirement.rationale ?? '');
    setPriority(
      (requirement.priority as RequirementPriority) || RequirementPriority.MUST,
    );
    setGxpRelevance(
      (requirement.gxpRelevance as GxPRelevance) || GxPRelevance.NONE,
    );
    setAcceptanceIntent(requirement.acceptanceIntent ?? '');
    setError(null);
    setSaving(false);
  }, [open, requirement]);

  const handleSave = async () => {
    if (!requirement) return;
    if (!title.trim() || !statement.trim()) {
      setError('Title and statement are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: requirement.id,
        requirementId: requirement.requirementId ?? requirement.id,
        title: title.trim(),
        statement: statement.trim(),
        rationale: rationale.trim() || undefined,
        priority,
        gxpRelevance,
        acceptanceIntent: acceptanceIntent.trim() || undefined,
        category: requirement.category,
        classification: requirement.classification,
        source: requirement.source,
        owner: requirement.owner,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit requirement</DialogTitle>
      <DialogContent>
        <Typography variant="caption" color="textSecondary" paragraph>
          Draft-only inline edit. Approved baselines remain immutable.
        </Typography>
        <TextField
          label="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          fullWidth
          margin="normal"
          variant="outlined"
        />
        <TextField
          label="Statement"
          value={statement}
          onChange={e => setStatement(e.target.value)}
          fullWidth
          multiline
          minRows={3}
          margin="normal"
          variant="outlined"
        />
        <TextField
          label="Rationale"
          value={rationale}
          onChange={e => setRationale(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          margin="normal"
          variant="outlined"
        />
        <Box display="flex" style={{ gap: 16 }}>
          <TextField
            select
            label="Priority"
            value={priority}
            onChange={e => setPriority(e.target.value as RequirementPriority)}
            margin="normal"
            variant="outlined"
            style={{ minWidth: 160 }}
          >
            {Object.values(RequirementPriority).map(p => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="GxP relevance"
            value={gxpRelevance}
            onChange={e => setGxpRelevance(e.target.value as GxPRelevance)}
            margin="normal"
            variant="outlined"
            style={{ minWidth: 160 }}
          >
            {Object.values(GxPRelevance).map(g => (
              <MenuItem key={g} value={g}>
                {g}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <TextField
          label="Acceptance criteria"
          value={acceptanceIntent}
          onChange={e => setAcceptanceIntent(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          margin="normal"
          variant="outlined"
          helperText="Stored as acceptance intent text for this draft."
        />
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          color="primary"
          variant="contained"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
