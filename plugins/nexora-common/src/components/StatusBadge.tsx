import { Chip } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  ConnectivityStatus,
  ContractCompatibility,
  HealthState,
  parseCompatibility,
  parseConnectivityStatus,
  parseHealthState,
} from '@internal/platform-common';
import { NEXORA_MUTED, NEXORA_NAVY, NEXORA_TEXT } from '../tokens';

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

/** Status chip tones aligned with Validation Expert / Plugin Directory. */
export const NEXORA_STATUS = {
  passBg: '#0D9488',
  passFg: '#FFFFFF',
  failBg: '#B91C1C',
  failFg: '#FFFFFF',
  warnBg: 'rgba(255, 138, 0, 0.14)',
  warnFg: '#9A3412',
  infoBg: 'rgba(10, 25, 41, 0.08)',
  infoFg: NEXORA_NAVY,
  neutralBg: '#E2E8F0',
  neutralFg: '#334155',
} as const;

const HEALTH_COLOR: Record<HealthState, string> = {
  HEALTHY: NEXORA_STATUS.passBg,
  WARNING: '#B45309',
  ERROR: NEXORA_STATUS.failBg,
  UNKNOWN: NEXORA_MUTED,
};

const CONNECT_COLOR: Record<ConnectivityStatus, string> = {
  CONNECTED: NEXORA_STATUS.passBg,
  DEGRADED: '#B45309',
  DISCONNECTED: NEXORA_STATUS.failBg,
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

export function StatusBadge({
  state,
  kind = 'health',
}: {
  state?: string;
  kind?: 'health' | 'connectivity' | 'compatibility';
}) {
  const classes = useStyles();

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
