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
import type { SigningPinStatus } from '../../api/types';

export interface SigningPinDialogProps {
  open: boolean;
  onClose: () => void;
  onEnrolled?: () => void;
}

/**
 * Enrol or change the caller's signing PIN (second factor for approvals).
 * Technical workflow control — not a Part 11 / GxP compliance claim.
 *
 * NXD-138: a first PIN needs nothing more; changing one needs the current
 * PIN, so the field appears only when a PIN exists. A locked seat cannot
 * change its PIN and is told so, with the way out (wait, or an administrator
 * reset). The server decides all of this again; the page only asks for what
 * it will need.
 */
export const SigningPinDialog: FC<SigningPinDialogProps> = ({
  open,
  onClose,
  onEnrolled,
}) => {
  const api = useApi(ursComposerApiRef);
  const [status, setStatus] = useState<SigningPinStatus | null>(null);
  const [current, setCurrent] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStatus(null);
      setCurrent('');
      setPin('');
      setConfirm('');
      setError(null);
      setSubmitting(false);
      return undefined;
    }
    let cancelled = false;
    api
      .getSigningPinStatus()
      .then(s => {
        if (!cancelled) setStatus(s);
      })
      .catch(e => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : 'Failed to read signing PIN status.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, open]);

  const enrolled = status?.enrolled === true;
  const lockedUntil = status?.lockedUntil;

  const handleSave = useCallback(async () => {
    if (enrolled && !current) {
      setError('Enter your current signing PIN to change it.');
      return;
    }
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
      await api.setSigningPin(pin, enrolled ? current : undefined);
      onEnrolled?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set signing PIN.');
    } finally {
      setSubmitting(false);
    }
  }, [api, confirm, current, enrolled, onClose, onEnrolled, pin]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {enrolled ? 'Change signing PIN' : 'Set signing PIN'}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" paragraph>
          Your signing PIN is a second factor used when approving baselines and
          change requests. It is a technical workflow control, not a validated
          GxP or 21 CFR Part 11 electronic signature claim.
        </Typography>
        {lockedUntil ? (
          <Typography role="alert" color="error" variant="body2" paragraph>
            Your signing PIN is locked after too many failed attempts, until{' '}
            {new Date(lockedUntil).toLocaleString()}. A locked PIN cannot be
            changed. Wait until then, or ask a platform administrator to reset
            it; you then set a new one here.
          </Typography>
        ) : null}
        {enrolled && !lockedUntil ? (
          <>
            <Typography variant="body2" paragraph>
              You already have a signing PIN. To change it, enter the current
              one; a wrong entry counts as a failed signing attempt. Forgotten
              it? A platform administrator can reset it.
            </Typography>
            <TextField
              type="password"
              label="Current signing PIN"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              fullWidth
              margin="normal"
              variant="outlined"
              autoComplete="off"
              inputProps={{ 'aria-label': 'Current signing PIN' }}
            />
          </>
        ) : null}
        {!lockedUntil ? (
          <>
            <TextField
              type="password"
              label="New signing PIN"
              value={pin}
              onChange={e => setPin(e.target.value)}
              fullWidth
              margin="normal"
              variant="outlined"
              helperText="Minimum 6 characters. Not your login password."
              autoComplete="off"
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
              autoComplete="off"
              inputProps={{ 'aria-label': 'Confirm signing PIN' }}
            />
          </>
        ) : null}
        {error && (
          <Typography color="error" variant="body2" role="alert">
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          {lockedUntil ? 'Close' : 'Cancel'}
        </Button>
        {!lockedUntil ? (
          <Button
            color="primary"
            variant="contained"
            onClick={handleSave}
            disabled={
              submitting ||
              status === null ||
              !pin ||
              !confirm ||
              (enrolled && !current)
            }
          >
            {submitting ? 'Saving…' : 'Save PIN'}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
};
