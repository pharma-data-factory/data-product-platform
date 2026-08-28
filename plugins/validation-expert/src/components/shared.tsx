import { ComponentProps, ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Button, Chip, makeStyles } from '@material-ui/core';

/** Nexora brand tokens (aligned with packages/app theme/tokens). */
export const NX = {
  base: '#F4F6F8',
  card: '#FFFFFF',
  border: '#E8EEF2',
  text: '#0F172A',
  muted: '#475569',
  navy: '#0A1929',
  teal: '#00C2D9',
  tealDark: '#0098AB',
  compliance: '#0891B2',
  security: '#FF8A00',
  passBg: '#0D9488',
  passFg: '#FFFFFF',
  failBg: '#B91C1C',
  failFg: '#FFFFFF',
  warnBg: 'rgba(255, 138, 0, 0.14)',
  warnFg: '#9A3412',
  infoBg: 'rgba(10, 25, 41, 0.08)',
  infoFg: '#0A1929',
  neutralBg: '#E2E8F0',
  neutralFg: '#334155',
} as const;

type ChipTone = {
  backgroundColor: string;
  color: string;
  border?: string;
};

function chipToneFor(value: string): ChipTone {
  const upper = value.toUpperCase().replace(/[_-]+/g, ' ').trim();

  if (
    upper === 'PASS' ||
    upper === 'PASSED' ||
    upper === 'COMPLETED' ||
    upper === 'READY' ||
    upper.startsWith('PASS ')
  ) {
    return { backgroundColor: NX.passBg, color: NX.passFg };
  }

  if (
    upper === 'FAIL' ||
    upper === 'FAILED' ||
    upper === 'ERROR' ||
    upper.includes('FAIL')
  ) {
    return { backgroundColor: NX.failBg, color: NX.failFg };
  }

  if (
    upper.includes('NOT VALIDATED') ||
    upper.includes('NOT_VALIDATED') ||
    upper === 'BLOCKED' ||
    upper === 'DEGRADED' ||
    upper.includes('UNVERIFIED') ||
    upper.includes('OPEN OBSERVATION') ||
    upper === 'NOT STARTED' ||
    upper === 'NOT CLAIMED'
  ) {
    return { backgroundColor: NX.warnBg, color: NX.warnFg };
  }

  if (
    upper === 'RUNNING' ||
    upper === 'IN PROGRESS' ||
    upper === 'STARTED' ||
    upper === 'ACTIVE'
  ) {
    return { backgroundColor: NX.infoBg, color: NX.infoFg };
  }

  if (upper === 'BASELINED' || upper === 'PLANNED') {
    return { backgroundColor: NX.compliance, color: '#FFFFFF' };
  }

  return {
    backgroundColor: NX.neutralBg,
    color: NX.neutralFg,
  };
}

const useStyles = makeStyles({
  nav: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  navButton: {
    borderColor: NX.border,
    color: NX.text,
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.02em',
    textTransform: 'none',
    '&:hover': {
      backgroundColor: 'rgba(0, 194, 217, 0.08)',
      borderColor: 'rgba(0, 194, 217, 0.45)',
    },
  },
  chip: {
    fontWeight: 600,
    letterSpacing: '0.04em',
  },
  page: {
    background: NX.base,
    minHeight: '100%',
    padding: 24,
  },
  title: {
    color: NX.text,
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    margin: '0 0 8px',
  },
  subtitle: {
    color: NX.muted,
    fontSize: 15,
    lineHeight: 1.55,
    margin: '0 0 20px',
    maxWidth: 880,
  },
  primaryButton: {
    background: `linear-gradient(135deg, ${NX.navy}, ${NX.tealDark})`,
    color: '#FFFFFF',
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontWeight: 600,
    textTransform: 'none',
    '&:hover': {
      background: `linear-gradient(135deg, ${NX.navy}, ${NX.teal})`,
      filter: 'brightness(1.05)',
    },
    '&:disabled': {
      background: NX.neutralBg,
      color: NX.muted,
    },
  },
});

const LINKS = [
  { to: '/validation-expert', label: 'Overview' },
  { to: '/validation-expert/requirements', label: 'Requirements' },
  { to: '/validation-expert/traceability', label: 'Traceability' },
  { to: '/validation-expert/risks', label: 'Risks' },
  { to: '/validation-expert/iq', label: 'IQ' },
  { to: '/validation-expert/oq', label: 'OQ' },
  { to: '/validation-expert/uat', label: 'UAT' },
  { to: '/validation-expert/runs', label: 'Runs' },
  { to: '/validation-expert/evidence', label: 'Evidence' },
  { to: '/validation-expert/findings', label: 'Findings' },
];

export function ValidationNav() {
  const classes = useStyles();
  return (
    <div className={classes.nav} aria-label="Validation Expert navigation">
      {LINKS.map(link => (
        <Button
          key={link.to}
          component={RouterLink}
          to={link.to}
          size="small"
          variant="outlined"
          className={classes.navButton}
        >
          {link.label}
        </Button>
      ))}
    </div>
  );
}

export function StatusChip({ value }: { value: string }) {
  const classes = useStyles();
  const tone = chipToneFor(value);
  return (
    <Chip
      size="small"
      label={value}
      className={classes.chip}
      style={{
        backgroundColor: tone.backgroundColor,
        color: tone.color,
        border: tone.border,
      }}
    />
  );
}

export function PrimaryActionButton({
  children,
  ...props
}: ComponentProps<typeof Button>) {
  const classes = useStyles();
  return (
    <Button
      variant="contained"
      disableElevation
      className={classes.primaryButton}
      {...props}
    >
      {children}
    </Button>
  );
}

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const classes = useStyles();
  return (
    <div className={classes.page}>
      <ValidationNav />
      <h1 className={classes.title}>{title}</h1>
      {subtitle ? <p className={classes.subtitle}>{subtitle}</p> : null}
      {children}
    </div>
  );
}
