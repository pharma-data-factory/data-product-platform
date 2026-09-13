import { useCallback, useEffect, useState, type FC } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
  Typography,
} from '@material-ui/core';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import { SignatureMeaning } from '../../api/types';

/**
 * What each signature asserts, in the signer's own words.
 *
 * 21 CFR Part 11 requires the meaning of a signature to be stated where it is
 * applied, not buried in a procedure document, so this text is shown in the
 * dialog rather than only the enum value.
 */
export const SIGNATURE_MEANING_TEXT: Readonly<Record<SignatureMeaning, string>> =
  {
    [SignatureMeaning.AUTHORED]:
      'I confirm that I authored this content and that it is complete and correct to the best of my knowledge.',
    [SignatureMeaning.REVIEWED]:
      'I confirm that I have reviewed this content and that it meets the applicable requirements.',
    [SignatureMeaning.APPROVED_QA]:
      'I approve this content on behalf of Quality Assurance and authorise its release.',
  };

const SIGNATURE_MEANING_TITLE: Readonly<Record<SignatureMeaning, string>> = {
  [SignatureMeaning.AUTHORED]: 'Sign as author',
  [SignatureMeaning.REVIEWED]: 'Sign as reviewer',
  [SignatureMeaning.APPROVED_QA]: 'Approve as Quality Assurance',
};

export interface ESignatureDialogProps {
  open: boolean;
  meaning: SignatureMeaning;
  /** What is being signed, for example "REQ-004 v2.0". */
  subject: string;
  /** Receives the PIN and the optional comment. Rejects to show the error. */
  onConfirm: (input: { pin: string; comment?: string }) => Promise<void>;
  onClose: () => void;
}

/**
 * Applies an electronic signature.
 *
 * Used for review signatures, QA approval, baseline release and change request
 * approval, so the wording and the re-authentication behave identically
 * everywhere a signature is captured.
 *
 * The PIN is held only for the duration of the request and cleared when the
 * dialog closes; it is never written to component state that outlives the
 * dialog, nor to storage.
 */
export const ESignatureDialog: FC<ESignatureDialogProps> = ({
  open,
  meaning,
  subject,
  onConfirm,
  onClose,
}) => {
  const identityApi = useApi(identityApiRef);
  const [userRef, setUserRef] = useState<string>('');
  const [pin, setPin] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    identityApi
      .getBackstageIdentity()
      .then(identity => {
        if (active) {
          setUserRef(identity.userEntityRef);
        }
      })
      .catch(() => {
        // The signature itself is attributed server-side from the request
        // credentials, so a failure here only costs the display name.
        if (active) {
          setUserRef('');
        }
      });
    return () => {
      active = false;
    };
  }, [identityApi]);

  // Nothing typed survives a close, so a reopened dialog never carries someone
  // else's PIN or a stale comment.
  useEffect(() => {
    if (!open) {
      setPin('');
      setComment('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleConfirm = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({ pin, comment: comment.trim() || undefined });
      setPin('');
      setComment('');
    } catch (e) {
      // The API client throws URSApiError as a plain object, so an
      // instanceof Error check would hide the real message (e.g. the
      // role gate or PIN errors) behind a generic "Signing failed.".
      const message =
        e instanceof Error ? e.message : (e as { message?: unknown })?.message;
      setError(typeof message === 'string' ? message : 'Signing failed.');
    } finally {
      setSubmitting(false);
    }
  }, [comment, onConfirm, pin]);

  const canConfirm = pin.trim().length > 0 && !submitting;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{SIGNATURE_MEANING_TITLE[meaning]}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary">
          Signing
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          {subject}
        </Typography>

        <Box my={2}>
          <Divider />
        </Box>

        <Typography variant="body2" paragraph>
          {SIGNATURE_MEANING_TEXT[meaning]}
        </Typography>

        <Typography variant="body2" color="textSecondary">
          Signed by
        </Typography>
        <Typography variant="body2" gutterBottom>
          {userRef || 'Signed-in user'}
        </Typography>

        <Typography variant="body2" color="textSecondary">
          Date and time
        </Typography>
        <Typography variant="body2" gutterBottom>
          {/* Recorded server-side; shown so the signer sees what is captured. */}
          {new Date().toLocaleString()}
        </Typography>

        <TextField
          type="password"
          label="Signing PIN"
          value={pin}
          onChange={e => setPin(e.target.value)}
          fullWidth
          margin="normal"
          variant="outlined"
          inputProps={{ 'aria-label': 'Signing PIN' }}
          helperText="Your personal signing PIN, not your login password."
        />

        <TextField
          label="Comment (optional)"
          value={comment}
          onChange={e => setComment(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          margin="normal"
          variant="outlined"
          inputProps={{ 'aria-label': 'Comment' }}
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
          onClick={handleConfirm}
          disabled={!canConfirm}
        >
          {submitting ? 'Signing...' : 'Sign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
