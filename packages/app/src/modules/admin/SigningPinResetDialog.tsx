import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@material-ui/core';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { messageFromErrorBody } from '@internal/platform-common';
import { NEXORA_TONE } from '@internal/plugin-nexora-common';

/**
 * NXD-138. A platform administrator clears a seat's signing PIN.
 *
 * Clears, never sets: the dialog has no PIN field, and the URS Composer
 * refuses a reset that carries one. A reason is required and recorded in the
 * audit trail with who reset whom and when; the reset also lifts a lockout.
 * The seat then sets a new PIN itself before its next signature.
 */
export function SigningPinResetDialog(props: {
  /** Catalog user name, e.g. `demo-pm`; reset as `user:default/<name>`. */
  userName: string | null;
  onClose: () => void;
  onReset: (message: string) => void;
}) {
  const { userName, onClose, onReset } = props;
  const fetchApi = useApi(fetchApiRef);
  const discovery = useApi(discoveryApiRef);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReason('');
    setError(null);
    setSubmitting(false);
  }, [userName]);

  const reset = async () => {
    if (!userName) return;
    setSubmitting(true);
    setError(null);
    try {
      const base = await discovery.getBaseUrl('urs-composer');
      const response = await fetchApi.fetch(`${base}/signing-pin/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEntityRef: `user:default/${userName}`,
          reason: reason.trim(),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          messageFromErrorBody(body, `Reset failed (${response.status})`),
        );
      }
      onReset(
        `Signing PIN of ${userName} reset. They set a new one before their next signature.`,
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!userName} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reset signing PIN</DialogTitle>
      <DialogContent>
        <Typography variant="body2" paragraph>
          Clears the signing PIN of <strong>{userName}</strong>, together with
          its failed attempts and any lockout. You do not set a new PIN: they
          set one themselves in the URS Composer before their next signature.
          The reset is recorded in the audit trail with your name and the
          reason.
        </Typography>
        <TextField
          id="signing-pin-reset-reason"
          label="Reason"
          required
          fullWidth
          multiline
          minRows={2}
          value={reason}
          onChange={e => setReason(e.target.value)}
          margin="normal"
          variant="outlined"
          helperText="For example: forgotten PIN, ticket number"
        />
        {error ? (
          <Typography
            role="alert"
            variant="body2"
            style={{ color: NEXORA_TONE.danger.text }}
          >
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={submitting || !reason.trim()}
          onClick={reset}
        >
          {submitting ? 'Resetting…' : 'Reset PIN'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
