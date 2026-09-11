import { ComponentProps, ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Button, Chip, makeStyles } from '@material-ui/core';
import {
  NEXORA_BORDER,
  NEXORA_CARD,
  NEXORA_COMPLIANCE,
  NEXORA_CYAN,
  NEXORA_CYAN_DARK,
  NEXORA_MUTED,
  NEXORA_NAVY,
  NEXORA_SECURITY,
  NEXORA_STATUS,
  NEXORA_SURFACE,
  NEXORA_TEXT,
  nexoraColors,
  nexoraTypography,
} from '@internal/plugin-nexora-common';

/** Re-export brand surface map from shared design tokens. */
export const NX = {
  base: NEXORA_SURFACE,
  card: NEXORA_CARD,
  border: NEXORA_BORDER,
  text: NEXORA_TEXT,
  muted: NEXORA_MUTED,
  navy: NEXORA_NAVY,
  teal: NEXORA_CYAN,
  tealDark: NEXORA_CYAN_DARK,
  compliance: NEXORA_COMPLIANCE,
  security: NEXORA_SECURITY,
  passBg: NEXORA_STATUS.passBg,
  passFg: NEXORA_STATUS.passFg,
  failBg: NEXORA_STATUS.failBg,
  failFg: NEXORA_STATUS.failFg,
  warnBg: NEXORA_STATUS.warnBg,
  warnFg: NEXORA_STATUS.warnFg,
  infoBg: NEXORA_STATUS.infoBg,
  infoFg: NEXORA_STATUS.infoFg,
  neutralBg: NEXORA_STATUS.neutralBg,
  neutralFg: NEXORA_STATUS.neutralFg,
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
    upper === 'APPROVED' ||
    upper === 'CLOSED' ||
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
    upper === 'ACTIVE' ||
    upper === 'PENDING'
  ) {
    return { backgroundColor: NX.infoBg, color: NX.infoFg };
  }

  if (upper === 'BASELINED' || upper === 'PLANNED') {
    return { backgroundColor: NX.compliance, color: NEXORA_STATUS.onAccent };
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
    fontFamily: nexoraTypography.fontFamily.display,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.02em',
    textTransform: 'none',
    '&:hover': {
      backgroundColor: nexoraColors.light.cyanTint,
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
    fontFamily: nexoraTypography.fontFamily.display,
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
    color: NEXORA_STATUS.onAccent,
    fontFamily: nexoraTypography.fontFamily.display,
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
  { to: '/validation-expert/contexts', label: 'Contexts' },
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
