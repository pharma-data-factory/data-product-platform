/**
 * Approving or releasing as an attested act (NXD-128).
 *
 * For a GMP-relevant product (INDIRECT, DIRECT or no answer) the act is an
 * electronic signature: its meaning, a required justification, and the
 * signing PIN — the platform's one PIN, also used for URS and validation
 * signatures. For NONE it is a confirmation, with an optional justification.
 * The server re-checks either way.
 */

import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  TextField,
  Typography,
} from '@material-ui/core';
import { NEXORA_TONE } from '@internal/plugin-nexora-common';
import type { SignatureInput } from '../api';

export type ApprovalAct = 'VERSION_APPROVED' | 'VERSION_RELEASED' | 'BASELINE_APPROVED';

const TITLE: Record<ApprovalAct, string> = {
  VERSION_APPROVED: 'Approve version',
  VERSION_RELEASED: 'Release version',
  BASELINE_APPROVED: 'Approve baseline',
};

export const MEANING: Record<ApprovalAct, string> = {
  VERSION_APPROVED:
    'I approve this product version: I have reviewed its scope, components and traceability against the bound requirements.',
  VERSION_RELEASED:
    'I release this product version for use: every release-gate check passed and its validation is approved.',
  BASELINE_APPROVED:
    'I approve this baseline as the controlled snapshot of the version: its components, contracts, traceability and URS binding.',
};

/** Only an explicit NONE takes a product out of the signature rule. */
export function requiresSignature(gxpRelevance: string | undefined): boolean {
  return gxpRelevance !== 'NONE';
}

export function ApprovalDialog(props: {
  act: ApprovalAct | null;
  /** What is being approved, e.g. "oee-line-3 1.0". */
  subject: string;
  gxpRelevance: string | undefined;
  onConfirm: (signature: SignatureInput) => Promise<void>;
  onClose: () => void;
}) {
  const { act, subject, gxpRelevance, onConfirm, onClose } = props;
  const signed = requiresSignature(gxpRelevance);
  const [justification, setJustification] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nothing typed survives a close, so a reopened dialog never carries a PIN.
  useEffect(() => {
    if (!act) {
      setJustification('');
      setPin('');
      setBusy(false);
      setError(null);
    }
  }, [act]);

  if (!act) {
    return null;
  }

  const canConfirm =
    !busy && (!signed || (justification.trim().length > 0 && pin.length > 0));

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm({
        justification: justification.trim() || undefined,
        pin: signed ? pin : undefined,
      });
    } catch (e) {
      // The server's reason, verbatim (cf. NXD-104).
      setError(e instanceof Error ? e.message : String(e));
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{TITLE[act]}</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1" gutterBottom>
          {subject}
        </Typography>
        <Typography variant="body2" paragraph>
          {MEANING[act]}
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          {signed
            ? 'This product is GMP-relevant, so this is an electronic signature: a justification and your signing PIN.'
            : 'This product is not GMP-relevant: confirm, and add a justification if you like.'}
        </Typography>
        <TextField
          id="approval-justification"
          label="Justification"
          required={signed}
          fullWidth
          multiline
          minRows={2}
          value={justification}
          onChange={e => setJustification(e.target.value)}
          margin="normal"
        />
        {signed ? (
          <>
            <TextField
              id="approval-pin"
              label="Signing PIN"
              type="password"
              required
              fullWidth
              value={pin}
              onChange={e => setPin(e.target.value)}
              margin="normal"
              autoComplete="off"
            />
            <Typography variant="caption" color="textSecondary">
              No PIN yet? Set it with “Set signing PIN” on any requirement set in
              the <Link href="/urs-composer">URS Composer</Link>; it is one PIN for
              every signature.
            </Typography>
          </>
        ) : null}
        {error ? (
          <Typography role="alert" style={{ color: NEXORA_TONE.danger.text, marginTop: 8 }}>
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button color="primary" variant="contained" disabled={!canConfirm} onClick={confirm}>
          {signed ? 'Sign' : 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
