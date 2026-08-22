import { makeStyles } from '@material-ui/core/styles';
import {
  ConnectivityStatus,
  HealthState,
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
});

const HEALTH_COLOR: Record<HealthState, string> = {
  HEALTHY: '#0F766E',
  WARNING: '#B45309',
  ERROR: '#B91C1C',
  UNKNOWN: NEXORA_MUTED,
};

const CONNECT_COLOR: Record<ConnectivityStatus, string> = {
  CONNECTED: '#0F766E',
  DEGRADED: '#B45309',
  DISCONNECTED: '#B91C1C',
  UNKNOWN: NEXORA_MUTED,
};

export function StatusBadge({
  state,
  kind = 'health',
}: {
  state?: string;
  kind?: 'health' | 'connectivity';
}) {
  const classes = useStyles();
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
