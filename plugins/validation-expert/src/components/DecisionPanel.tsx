/**
 * The validation decision on a context, and the signatures it is made of
 * (NXD-120; the rule is NXD-119).
 *
 * For a GMP-relevant product the validation expert signs first and QA
 * approves after; otherwise one signature from either decides. The panel
 * offers a signature only to someone who holds the role that is due, and
 * says to everyone else who signs next and why — the server re-checks every
 * signature, so this decides nothing.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import type {
  ValidationSignatureRole,
  ValidationSignatureVerdict,
} from '@internal/platform-common';
import { DecisionStateView, validationExpertApiRef } from '../api';
import { NX, StatusChip } from './shared';

export const ROLE_LABEL: Readonly<Record<ValidationSignatureRole, string>> = {
  VALIDATION_EXPERT: 'Validation expert',
  QUALITY_ASSURANCE: 'Quality Assurance',
};

const ROLE_GROUP: Readonly<Record<ValidationSignatureRole, string>> = {
  VALIDATION_EXPERT: 'validation-experts',
  QUALITY_ASSURANCE: 'urs-quality-reviewers',
};

/** What a signature means, shown above the PIN like the URS signatures. */
export const SIGNATURE_MEANING: Readonly<
  Record<ValidationSignatureRole, Record<ValidationSignatureVerdict, string>>
> = {
  VALIDATION_EXPERT: {
    APPROVED:
      'I confirm as validation expert that the executed tests cover the requirements of this baseline and that they passed.',
    REJECTED:
      'I reject this validation as validation expert: the tests do not adequately cover or demonstrate the requirements.',
  },
  QUALITY_ASSURANCE: {
    APPROVED:
      'I approve this validation on behalf of Quality Assurance: the process was followed and release on this basis is justified.',
    REJECTED:
      'I reject this validation on behalf of Quality Assurance: release on this basis is not justified.',
  },
};

function formatWhen(value?: string) {
  if (!value) return '—';
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? value : new Date(parsed).toLocaleString();
}

/** One sentence: who signs next, or what was decided. */
export function nextStepText(state: DecisionStateView): string {
  if (state.decision) {
    return state.decision.status === 'APPROVED'
      ? `Approved${state.decision.gmpRule ? ' by the validation expert and QA' : ''}.`
      : 'Rejected. A rejected validation is not re-opened; start a new one after the findings are fixed.';
  }
  const next = state.progress.nextRoles;
  if (next.length === 2) {
    return 'Waiting for one signature: the validation expert or QA.';
  }
  if (next[0] === 'QUALITY_ASSURANCE') {
    return 'The validation expert has signed. Waiting for QA approval.';
  }
  return state.gmpRelevant
    ? 'Waiting for the validation expert. QA approves after them.'
    : 'Waiting for the validation expert.';
}

export function DecisionPanel(props: { contextId: string }) {
  const { contextId } = props;
  const api = useApi(validationExpertApiRef);
  const [state, setState] = useState<DecisionStateView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingAs, setSigningAs] = useState<ValidationSignatureRole | null>(null);
  const [pinDialog, setPinDialog] = useState(false);

  const load = useCallback(() => {
    setError(null);
    api
      .getDecisionState(contextId)
      .then(setState)
      .catch(err =>
        setError(err instanceof Error ? err.message : 'Failed to load the decision'),
      );
  }, [api, contextId]);

  useEffect(load, [load]);

  if (error) {
    return (
      <Section>
        <Typography color="error">{error}</Typography>
      </Section>
    );
  }
  if (!state) {
    return (
      <Section>
        <Typography variant="body2" color="textSecondary">
          Loading the validation decision…
        </Typography>
      </Section>
    );
  }

  const due = state.progress.nextRoles;
  const mine = state.myRoles.filter(role => due.includes(role));

  return (
    <Section>
      <Box display="flex" alignItems="center" style={{ gap: 12 }} mb={1}>
        <Typography variant="h6">Validation decision</Typography>
        <StatusChip value={state.decision?.status ?? 'OPEN'} />
      </Box>

      <Typography variant="body2" paragraph>
        {state.gmpRelevant ? (
          <>
            <strong>GMP-relevant</strong> — the validation expert signs, then QA
            approves.
          </>
        ) : (
          <>
            <strong>Not GMP-relevant</strong> — one signature from the
            validation expert or QA decides.
          </>
        )}{' '}
        {state.products.length > 0
          ? `Products on this baseline: ${state.products
              .map(p => `${p.name} (${p.gxpRelevance ?? 'GxP relevance not answered'})`)
              .join(', ')}.`
          : 'No product is bound to this baseline yet, so the GMP rule applies.'}
      </Typography>
      {state.classificationError ? (
        <Typography variant="body2" paragraph style={{ color: NX.failFg }}>
          {state.classificationError}
        </Typography>
      ) : null}

      <Typography variant="body2" paragraph>
        <strong>{nextStepText(state)}</strong>
      </Typography>

      {state.signatures.length > 0 ? (
        <Table size="small" aria-label="Signatures">
          <TableHead>
            <TableRow>
              <TableCell>Role</TableCell>
              <TableCell>Verdict</TableCell>
              <TableCell>Signed by</TableCell>
              <TableCell>When</TableCell>
              <TableCell>Justification</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {state.signatures.map(s => (
              <TableRow key={s.id}>
                <TableCell>{ROLE_LABEL[s.role]}</TableCell>
                <TableCell>
                  <StatusChip value={s.verdict} />
                </TableCell>
                <TableCell>{s.signedBy}</TableCell>
                <TableCell>{formatWhen(s.signedAt)}</TableCell>
                <TableCell>{s.justification}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      {state.decision ? null : (
        <Box mt={2} display="flex" style={{ gap: 12 }} flexWrap="wrap" alignItems="center">
          {mine.map(role => (
            <Button
              key={role}
              variant="contained"
              color="primary"
              onClick={() => setSigningAs(role)}
            >
              Sign as {ROLE_LABEL[role].toLowerCase()}
            </Button>
          ))}
          {mine.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              {state.myRoles.length === 0
                ? `Signing needs ${due.map(r => ROLE_GROUP[r]).join(' or ')} membership.`
                : `It is not your turn: ${due.map(r => ROLE_LABEL[r]).join(' or ')} signs next.`}
            </Typography>
          ) : null}
          {state.myRoles.length > 0 ? (
            <Button variant="text" onClick={() => setPinDialog(true)}>
              Set signing PIN
            </Button>
          ) : null}
        </Box>
      )}

      <SignDialog
        role={signingAs}
        contextId={contextId}
        onClose={() => setSigningAs(null)}
        onSigned={() => {
          setSigningAs(null);
          load();
        }}
      />
      <PinDialog open={pinDialog} onClose={() => setPinDialog(false)} />
    </Section>
  );
}

function Section(props: { children: React.ReactNode }) {
  return (
    <Box
      mt={3}
      mb={2}
      p={2}
      aria-label="Validation decision"
      component="section"
      style={{
        border: `1px solid ${NX.border}`,
        borderRadius: 8,
        background: NX.card,
      }}
    >
      {props.children}
    </Box>
  );
}

export function SignDialog(props: {
  role: ValidationSignatureRole | null;
  contextId: string;
  onClose: () => void;
  onSigned: () => void;
}) {
  const { role, contextId, onClose, onSigned } = props;
  const api = useApi(validationExpertApiRef);
  const [verdict, setVerdict] = useState<ValidationSignatureVerdict>('APPROVED');
  const [justification, setJustification] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nothing typed survives a close, so a reopened dialog never carries a PIN.
  useEffect(() => {
    if (!role) {
      setVerdict('APPROVED');
      setJustification('');
      setPin('');
      setError(null);
      setSubmitting(false);
    }
  }, [role]);

  if (!role) {
    return null;
  }

  const canSign = justification.trim().length > 0 && pin.length > 0 && !submitting;

  async function sign() {
    if (!role) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.signDecision(contextId, {
        role,
        verdict,
        justification: justification.trim(),
        pin,
      });
      onSigned();
    } catch (e) {
      // The server's reason, verbatim: a wrong PIN, a lockout or Segregation
      // of Duties must be named, not "Signing failed" (cf. NXD-104).
      setError(e instanceof Error ? e.message : String(e));
      setPin('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Sign as {ROLE_LABEL[role].toLowerCase()}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary">
          Signing the validation decision on
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          {contextId}
        </Typography>
        <RadioGroup
          row
          value={verdict}
          onChange={e => setVerdict(e.target.value as ValidationSignatureVerdict)}
        >
          <FormControlLabel value="APPROVED" control={<Radio />} label="Approve" />
          <FormControlLabel value="REJECTED" control={<Radio />} label="Reject" />
        </RadioGroup>
        <Typography variant="body2" paragraph>
          {SIGNATURE_MEANING[role][verdict]}
        </Typography>
        <TextField
          id="validation-signature-justification"
          label="Justification"
          required
          fullWidth
          multiline
          minRows={3}
          value={justification}
          onChange={e => setJustification(e.target.value)}
          margin="normal"
        />
        <TextField
          id="validation-signature-pin"
          label="Signing PIN"
          type="password"
          required
          fullWidth
          value={pin}
          onChange={e => setPin(e.target.value)}
          margin="normal"
          autoComplete="off"
        />
        {error ? (
          <Typography role="alert" style={{ color: NX.failFg }}>
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button color="primary" variant="contained" disabled={!canSign} onClick={sign}>
          {submitting ? 'Signing…' : 'Sign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PinDialog(props: { open: boolean; onClose: () => void }) {
  const api = useApi(validationExpertApiRef);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!props.open) {
      setPin('');
      setConfirm('');
      setError(null);
      setSaving(false);
    }
  }, [props.open]);

  async function save() {
    if (pin !== confirm) {
      setError('The two PINs differ.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.setSigningPin(pin);
      props.onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Set signing PIN</DialogTitle>
      <DialogContent>
        <Typography variant="body2" paragraph>
          One PIN for every signature on the platform — URS approvals and
          validation decisions. At least six characters.
        </Typography>
        <TextField
          id="signing-pin-new"
          label="New PIN"
          type="password"
          fullWidth
          value={pin}
          onChange={e => setPin(e.target.value)}
          margin="normal"
          autoComplete="off"
        />
        <TextField
          id="signing-pin-repeat"
          label="Repeat PIN"
          type="password"
          fullWidth
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          margin="normal"
          autoComplete="off"
        />
        {error ? (
          <Typography role="alert" style={{ color: NX.failFg }}>
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          color="primary"
          variant="contained"
          disabled={saving || pin.length < 6}
          onClick={save}
        >
          Save PIN
        </Button>
      </DialogActions>
    </Dialog>
  );
}
