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
  MenuItem,
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
import { Link as RouterLink } from 'react-router-dom';
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

export function DecisionPanel(props: {
  contextId: string;
  /** May start a product evidence review (validation.run.start). */
  canStartReview?: boolean;
  /** Called after a review run was created, so the page can list it. */
  onRunCreated?: () => void;
}) {
  const { contextId, canStartReview, onRunCreated } = props;
  const api = useApi(validationExpertApiRef);
  const [state, setState] = useState<DecisionStateView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingAs, setSigningAs] = useState<ValidationSignatureRole | null>(null);
  const [pinDialog, setPinDialog] = useState(false);
  // NXD-127: the decision shown is for one product version; the server picks
  // the newest bound one until the user picks another.
  const [versionId, setVersionId] = useState<string | undefined>(undefined);

  const load = useCallback(() => {
    setError(null);
    api
      .getDecisionState(contextId, versionId)
      .then(setState)
      .catch(err =>
        setError(err instanceof Error ? err.message : 'Failed to load the decision'),
      );
  }, [api, contextId, versionId]);

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
  const versions = state.versions ?? [];
  const current = versions.find(v => v.id === state.productVersionId);

  return (
    <Section>
      <Box display="flex" alignItems="center" style={{ gap: 12 }} mb={1} flexWrap="wrap">
        <Typography variant="h6">Validation decision</Typography>
        {current ? <StatusChip value={state.decision?.status ?? 'OPEN'} /> : null}
        {versions.length > 0 ? (
          <TextField
            select
            id="decision-product-version"
            label="Product version"
            value={state.productVersionId ?? ''}
            onChange={e => setVersionId(e.target.value)}
            style={{ minWidth: 280 }}
          >
            {versions.map(v => (
              <MenuItem key={v.id} value={v.id}>
                {v.productName} {v.version} ({v.status})
              </MenuItem>
            ))}
          </TextField>
        ) : null}
      </Box>
      <Typography variant="body2" color="textSecondary" paragraph>
        A validation decision is for one product version: each version is
        reviewed and signed on its own evidence.
      </Typography>

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

      {current ? (
        <EvidenceSection
          contextId={contextId}
          productVersionId={current.id}
          state={state}
          canStart={Boolean(canStartReview) && !state.decision}
          onCreated={() => {
            load();
            onRunCreated?.();
          }}
        />
      ) : (
        <Typography variant="body2" color="textSecondary" paragraph>
          No product version is bound to this baseline, so there is nothing to
          validate yet.
        </Typography>
      )}

      {current ? (
        <Typography variant="body2" paragraph>
          <strong>{nextStepText(state)}</strong>
        </Typography>
      ) : null}

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

      {state.decision || !current ? null : (
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

      {state.otherDecisions && state.otherDecisions.length > 0 ? (
        <Typography variant="body2" color="textSecondary" style={{ marginTop: 12 }}>
          Other decisions on this baseline:{' '}
          {state.otherDecisions
            .map(d => {
              const v = versions.find(x => x.id === d.productVersionId);
              const label = v
                ? `${v.productName} ${v.version}`
                : 'recorded per baseline before NXD-127 (covers no version)';
              return `${label}: ${d.status}`;
            })
            .join(' · ')}
        </Typography>
      ) : null}

      <SignDialog
        role={signingAs}
        contextId={contextId}
        productVersionId={current?.id ?? ''}
        evidenceComplete={Boolean(state.evidence?.complete)}
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

/**
 * The product evidence a decision rests on (NXD-124): the newest review, and
 * — for whoever may start runs — a review of a version bound to the baseline.
 */
function EvidenceSection(props: {
  contextId: string;
  productVersionId: string;
  state: DecisionStateView;
  canStart: boolean;
  onCreated: () => void;
}) {
  const { contextId, productVersionId, state, canStart, onCreated } = props;
  const api = useApi(validationExpertApiRef);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const evidence = state.evidence;

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await api.startEvidenceReview(contextId, productVersionId);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box mb={2} aria-label="Product evidence">
      <Typography variant="body2">
        <strong>Product evidence</strong>{' '}
        {evidence ? (
          <>
            — newest review{' '}
            <RouterLink to={`/validation-expert/runs/${encodeURIComponent(evidence.runId)}`}>
              {evidence.runId}
            </RouterLink>{' '}
            ({evidence.candidate}): {evidence.passed} of {evidence.total} requirements
            passed{evidence.complete ? '.' : ' — approval is not possible yet.'}
          </>
        ) : (
          '— no review yet. Approval needs one in which every requirement passed.'
        )}
      </Typography>
      {canStart ? (
        <Box mt={1}>
          <Button variant="outlined" disabled={busy} onClick={start}>
            {busy ? 'Reviewing…' : 'Run product evidence review'}
          </Button>
        </Box>
      ) : null}
      {error ? (
        <Typography role="alert" variant="body2" style={{ color: NX.failFg }}>
          {error}
        </Typography>
      ) : null}
    </Box>
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
  /** NXD-127: the version whose validation is signed. */
  productVersionId: string;
  /** NXD-124: approval needs passing product evidence for every requirement. */
  evidenceComplete: boolean;
  onClose: () => void;
  onSigned: () => void;
}) {
  const { role, contextId, productVersionId, evidenceComplete, onClose, onSigned } = props;
  const api = useApi(validationExpertApiRef);
  const initialVerdict: ValidationSignatureVerdict = evidenceComplete
    ? 'APPROVED'
    : 'REJECTED';
  const [verdict, setVerdict] = useState<ValidationSignatureVerdict>(initialVerdict);
  const [justification, setJustification] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nothing typed survives a close, so a reopened dialog never carries a PIN.
  useEffect(() => {
    if (!role) {
      setVerdict(initialVerdict);
      setJustification('');
      setPin('');
      setError(null);
      setSubmitting(false);
    }
  }, [role, initialVerdict]);

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
        productVersionId,
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
          <FormControlLabel
            value="APPROVED"
            control={<Radio />}
            label="Approve"
            disabled={!evidenceComplete}
          />
          <FormControlLabel value="REJECTED" control={<Radio />} label="Reject" />
        </RadioGroup>
        {evidenceComplete ? null : (
          <Typography variant="body2" paragraph style={{ color: NX.failFg }}>
            Approval needs a product evidence review in which every requirement
            passed. You can reject.
          </Typography>
        )}
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
