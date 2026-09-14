import { Chip } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  ConnectivityStatus,
  ContractCompatibility,
  HealthState,
  parseCompatibility,
  parseConnectivityStatus,
  parseHealthState,
  ursStatusAppearance,
} from '@internal/platform-common';
import {
  NEXORA_MUTED,
  NEXORA_NAVY,
  NEXORA_STATUS,
  NEXORA_TEXT,
  NEXORA_TONE,
} from '../tokens';

/**
 * Re-exported for the call sites that already import it from here. The values
 * live in ../tokens, because a palette in component code cannot be managed
 * centrally and does not follow the theme.
 */
export { NEXORA_STATUS };

const useStyles = makeStyles({
  badge: {
    alignItems: 'center',
    display: 'inline-flex',
    fontSize: 13,
    fontWeight: 600,
    gap: 8,
  },
  dot: {
    borderRadius: '50%',
    height: 10,
    width: 10,
  },
  chip: {
    fontSize: 12,
    fontWeight: 600,
    height: 24,
    letterSpacing: '0.04em',
  },
});

const HEALTH_COLOR: Record<HealthState, string> = {
  HEALTHY: NEXORA_TONE.success.text,
  WARNING: NEXORA_TONE.warning.text,
  ERROR: NEXORA_TONE.danger.text,
  UNKNOWN: NEXORA_MUTED,
};

const CONNECT_COLOR: Record<ConnectivityStatus, string> = {
  CONNECTED: NEXORA_TONE.success.text,
  DEGRADED: NEXORA_TONE.warning.text,
  DISCONNECTED: NEXORA_TONE.danger.text,
  UNKNOWN: NEXORA_MUTED,
};

const COMPATIBILITY_TONE: Record<
  ContractCompatibility,
  { backgroundColor: string; color: string }
> = {
  COMPATIBLE: {
    backgroundColor: NEXORA_STATUS.passBg,
    color: NEXORA_STATUS.passFg,
  },
  BREAKING_CHANGE: {
    backgroundColor: NEXORA_STATUS.failBg,
    color: NEXORA_STATUS.failFg,
  },
  UNKNOWN: {
    backgroundColor: NEXORA_STATUS.neutralBg,
    color: NEXORA_STATUS.neutralFg,
  },
};

const ENTITLEMENT_TONE: Record<
  string,
  { backgroundColor: string; color: string }
> = {
  ACTIVE: {
    backgroundColor: NEXORA_STATUS.passBg,
    color: NEXORA_STATUS.passFg,
  },
  PENDING: {
    backgroundColor: NEXORA_STATUS.warnBg,
    color: NEXORA_STATUS.warnFg,
  },
  SUSPENDED: {
    backgroundColor: NEXORA_STATUS.failBg,
    color: NEXORA_STATUS.failFg,
  },
  EXPIRED: {
    backgroundColor: NEXORA_STATUS.neutralBg,
    color: NEXORA_STATUS.neutralFg,
  },
  UNKNOWN: {
    backgroundColor: NEXORA_STATUS.neutralBg,
    color: NEXORA_STATUS.neutralFg,
  },
};

export function StatusBadge({
  state,
  kind = 'health',
}: {
  state?: string;
  kind?: 'health' | 'connectivity' | 'compatibility' | 'entitlement' | 'urs';
}) {
  const classes = useStyles();

  if (kind === 'urs') {
    // The wording, tone and strike-through all come from the domain layer
    // (ursStatusAppearance), so every URS surface reads the same. Only the
    // colour is decided here.
    const appearance = ursStatusAppearance(state ?? '');
    const tone = NEXORA_TONE[appearance.tone];
    return (
      <Chip
        size="small"
        label={appearance.label}
        className={classes.chip}
        style={{
          backgroundColor: tone.bg,
          color: tone.fg,
          ...(appearance.strikeThrough
            ? { textDecoration: 'line-through' }
            : {}),
        }}
        aria-label={`requirement status ${appearance.label}`}
      />
    );
  }

  if (kind === 'entitlement') {
    const label = state && ENTITLEMENT_TONE[state] ? state : 'UNKNOWN';
    const tone = ENTITLEMENT_TONE[label];
    return (
      <Chip
        size="small"
        label={label}
        className={classes.chip}
        style={{
          backgroundColor: tone.backgroundColor,
          color: tone.color,
        }}
        aria-label={`entitlement status ${label}`}
      />
    );
  }

  if (kind === 'compatibility') {
    const label = parseCompatibility(state);
    const tone = COMPATIBILITY_TONE[label];
    return (
      <Chip
        size="small"
        label={label}
        className={classes.chip}
        style={{
          backgroundColor: tone.backgroundColor,
          color: tone.color,
        }}
        aria-label={`compatibility status ${label}`}
        title="Contract compatibility for active consumers. Not GxP validation."
      />
    );
  }

  const label =
    kind === 'connectivity'
      ? parseConnectivityStatus(state)
      : parseHealthState(state);
  const color =
    kind === 'connectivity'
      ? CONNECT_COLOR[parseConnectivityStatus(state)]
      : HEALTH_COLOR[parseHealthState(state)];
  return (
    <span
      className={classes.badge}
      style={{ color: NEXORA_TEXT }}
      aria-label={`${kind} status ${label}`}
    >
      <span
        className={classes.dot}
        style={{ background: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

export function StatusWord({ children }: { children: string }) {
  return (
    <strong style={{ color: NEXORA_NAVY, letterSpacing: '0.04em' }}>
      {children}
    </strong>
  );
}
