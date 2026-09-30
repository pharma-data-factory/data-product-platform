import { useCallback } from 'react';
import { Progress } from '@backstage/core-components';
import {
  Box,
  Button,
  Card,
  CardContent,
  Tooltip,
  Typography,
} from '@material-ui/core';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import {
  LoadError,
  useLoadable,
  withAlpha,
} from '@internal/plugin-nexora-common';
import type { ProductRequirementCoverage } from '@internal/platform-common';
import type { ReleaseGateBlocker, ReleaseGateResult } from '../api';

/**
 * NXD-100. Release readiness at a glance, for every version.
 *
 * The gate was a card that appeared only at RELEASE_CANDIDATE and only after
 * pressing "Check Gate", listing raw codes such as NO_APPROVED_BASELINE. The
 * endpoint answers for any version, precisely so blockers can be seen and
 * cleared while the version is still being built. This loads it for the
 * selected version, names each blocker, and shows requirement coverage as
 * meters beside it.
 *
 * Deliberately NOT a "7 of 11 checks" ring. The gate returns blockers, not a
 * list of checks, and its codes are partly conditional and mutually exclusive
 * (NO_URS_BASELINE vs NO_APPROVED_URS_BASELINE) — any denominator would be
 * invented. Coverage has a real one, the requirement count, so it gets meters.
 *
 * Colours were chosen with the dataviz validator, not by eye: the meter is
 * brand navy (light) / indigo (dark), because the brand cyan first tried was
 * ΔE 4.4 from the success teal — a coverage bar would have read as "passed".
 */

const BLOCKER_TITLES: Record<string, string> = {
  INVALID_STATUS: 'Version is not a release candidate',
  NO_COMPONENTS: 'No components',
  UNTRACED_COMPONENT: 'A component has no traceability link',
  INCOMPLETE_TRACEABILITY: 'Requirements are not all verified',
  NO_APPROVED_BASELINE: 'No approved product baseline',
  NO_URS_BASELINE: 'No URS baseline bound',
  NO_APPROVED_URS_BASELINE: 'The bound URS baseline is not approved',
  NO_APPROVED_VALIDATION_DECISION: 'No approved validation decision',
  VALIDATION_DECISION_CHECK_FAILED: 'The validation decision could not be checked',
  POLICY_OBLIGATION_UNMET: 'A policy obligation is not met',
  POLICY_PACK_UNRESOLVABLE: 'The policy pack could not be resolved',
};

export function blockerTitle(blocker: ReleaseGateBlocker): string {
  return BLOCKER_TITLES[blocker.code] ?? blocker.code;
}

/** Validated in both modes; see the header note. */
function tones(dark: boolean) {
  return dark
    ? { good: '#2DD4BF', bad: '#F87171', meter: '#818CF8' }
    : { good: '#0F766E', bad: '#B91C1C', meter: '#1E3A5F' };
}

const useStyles = makeStyles(theme => ({
  header: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  status: {
    alignItems: 'center',
    display: 'flex',
    fontSize: 16,
    fontWeight: 600,
    gap: 8,
  },
  blockers: { listStyle: 'none', margin: '12px 0 0', padding: 0 },
  blocker: {
    display: 'flex',
    gap: 8,
    padding: '6px 0',
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  blockerTitle: { fontSize: 14, fontWeight: 600 },
  blockerMessage: { color: theme.palette.text.secondary, fontSize: 13 },
  coverage: { marginTop: 16, marginBottom: 8 },
  meterRow: {
    alignItems: 'center',
    display: 'grid',
    gap: 12,
    gridTemplateColumns: '96px 1fr 88px',
    marginTop: 8,
  },
  meterLabel: { fontSize: 13 },
  meterValue: {
    color: theme.palette.text.secondary,
    fontSize: 13,
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
  },
  track: { borderRadius: 4, height: 8, overflow: 'hidden', width: '100%' },
  fill: { borderRadius: 4, height: '100%' },
  unknown: {
    alignItems: 'center',
    color: theme.palette.text.secondary,
    display: 'flex',
    fontSize: 13,
    gap: 4,
  },
}));

function Meter({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const classes = useStyles();
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);
  const summary = `${value} of ${total} (${percent}%)`;
  return (
    <div className={classes.meterRow}>
      <Typography className={classes.meterLabel}>{label}</Typography>
      <Tooltip title={`${label}: ${summary}`} placement="top">
        <div
          className={classes.track}
          style={{ background: withAlpha(color, 0.18) }}
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={value}
          aria-valuetext={summary}
        >
          <div
            className={classes.fill}
            style={{ width: `${percent}%`, background: color }}
          />
        </div>
      </Tooltip>
      <Typography className={classes.meterValue}>
        {value} of {total}
      </Typography>
    </div>
  );
}

export function ReleaseReadinessCard({
  versionLabel,
  loadGate,
  refreshKey,
  coverage,
}: {
  versionLabel: string;
  /** The page owns the client; this card owns when to ask. */
  loadGate: () => Promise<ReleaseGateResult>;
  /** Changes whenever something the gate reads has changed. */
  refreshKey: string;
  coverage: ProductRequirementCoverage | null;
}) {
  const classes = useStyles();
  const theme = useTheme();
  const tone = tones(theme.palette.type === 'dark');

  // refreshKey is a dependency on purpose: it is how a transition, a bound
  // baseline or new evidence re-runs the gate without the page wiring it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => loadGate(), [loadGate, refreshKey]);
  const { value: gate, loading, error, retry } = useLoadable(load);

  return (
    <Card variant="outlined" style={{ marginBottom: 16 }}>
      <CardContent>
        <div className={classes.header}>
          <Typography variant="subtitle1">
            Release readiness · {versionLabel}
          </Typography>
          <Button size="small" variant="outlined" onClick={retry} disabled={loading}>
            {loading ? 'Checking…' : 'Re-check'}
          </Button>
        </div>

        {loading && !gate && <Progress />}
        {error && (
          <LoadError error={error} what="the release gate" onRetry={retry} />
        )}
        {gate && !error && (
          <>
            {gate.passed ? (
              <Typography className={classes.status} style={{ color: tone.good }}>
                <CheckCircleIcon aria-hidden /> Ready to release — every
                release-gate check passes
              </Typography>
            ) : (
              <Typography className={classes.status} style={{ color: tone.bad }}>
                <ErrorIcon aria-hidden /> Blocked by {gate.blockers.length}{' '}
                {gate.blockers.length === 1 ? 'check' : 'checks'}
              </Typography>
            )}
          </>
        )}

        <Box className={classes.coverage} aria-label="Requirement coverage">
          <Typography variant="subtitle2">
            Requirement coverage
            {coverage
              ? ` · ${coverage.total} requirement${coverage.total === 1 ? '' : 's'}`
              : ''}
          </Typography>
          {!coverage || coverage.total === 0 ? (
            <Typography className={classes.meterValue} style={{ textAlign: 'left' }}>
              Bind a URS baseline to measure coverage.
            </Typography>
          ) : (
            <>
              <Meter
                label="Implemented"
                value={coverage.mapped}
                total={coverage.total}
                color={tone.meter}
              />
              <Meter
                label="Verified"
                value={coverage.verified}
                total={coverage.total}
                color={tone.meter}
              />
              {coverage.validationContextId ? (
                <Meter
                  label="Validated"
                  value={coverage.validated}
                  total={coverage.total}
                  color={tone.meter}
                />
              ) : (
                // Unknown is not zero: no validation context resolved, so an
                // empty bar would claim "nothing validated" (NXD-056).
                <div className={classes.meterRow}>
                  <Typography className={classes.meterLabel}>Validated</Typography>
                  <span className={classes.unknown}>
                    <HelpOutlineIcon fontSize="small" aria-hidden /> Unknown — no
                    validation context for this baseline
                  </span>
                  <span />
                </div>
              )}
            </>
          )}
        </Box>

        {gate && !error && (
          <>
            {!gate.passed && (
              <ul className={classes.blockers} aria-label="Release blockers">
                {gate.blockers.map((blocker, index) => (
                  <li key={`${blocker.code}-${index}`} className={classes.blocker}>
                    <ErrorIcon
                      fontSize="small"
                      aria-hidden
                      style={{ color: tone.bad, marginTop: 2 }}
                    />
                    <div>
                      <Typography className={classes.blockerTitle}>
                        {blockerTitle(blocker)}
                      </Typography>
                      <Typography className={classes.blockerMessage}>
                        {blocker.message}
                      </Typography>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

      </CardContent>
    </Card>
  );
}
