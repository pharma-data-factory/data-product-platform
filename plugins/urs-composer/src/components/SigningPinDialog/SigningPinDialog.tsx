import { useCallback, useEffect, useState, type FC } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import { ursComposerApiRef } from '../../api/ursComposerApi';

export interface SigningPinDialogProps {
  open: boolean;
  onClose: () => void;
  onEnrolled?: () => void;
}

/**
 * Enrol or replace the caller's signing PIN (second factor for approvals).
 * Technical workflow control — not a Part 11 / GxP compliance claim.
 */
export const SigningPinDialog: FC<SigningPinDialogProps> = ({
  open,
  onClose,
  onEnrolled,
}) => {
  const api = useApi(ursComposerApiRef);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPin('');
      setConfirm('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleSave = useCallback(async () => {
    if (pin.length < 6) {
      setError('PIN must be at least 6 characters.');
      return;
    }
    if (pin !== confirm) {
      setError('PIN and confirmation do not match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.setSigningPin(pin);
      onEnrolled?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set signing PIN.');
    } finally {
      setSubmitting(false);
    }
  }, [api, confirm, onClose, onEnrolled, pin]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Set signing PIN</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" paragraph>
          Your signing PIN is a second factor used when approving baselines and
          change requests. It is a technical workflow control, not a validated
          GxP or 21 CFR Part 11 electronic signature claim.
        </Typography>
        <TextField
          type="password"
          label="New signing PIN"
          value={pin}
          onChange={e => setPin(e.target.value)}
          fullWidth
          margin="normal"
          variant="outlined"
          helperText="Minimum 6 characters. Not your login password."
          inputProps={{ 'aria-label': 'New signing PIN' }}
        />
        <TextField
          type="password"
          label="Confirm PIN"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          fullWidth
          margin="normal"
          variant="outlined"
          inputProps={{ 'aria-label': 'Confirm signing PIN' }}
        />
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          color="primary"
          variant="contained"
          onClick={handleSave}
          disabled={submitting || !pin || !confirm}
        >
          {submitting ? 'Saving…' : 'Save PIN'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
