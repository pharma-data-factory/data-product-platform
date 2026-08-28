import { ReactNode } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  NEXORA_BORDER,
  NEXORA_CARD,
  NEXORA_CYAN_LIGHT,
  NEXORA_MUTED,
  NEXORA_NAVY,
  NEXORA_NAVY_DARK,
  NEXORA_TEXT,
} from '../tokens';

/**
 * Shared Nexora tool / Admin page chrome.
 * Visual language matches Platform Components (navy hero + white panel).
 * Intentionally avoids Backstage Page/Content so plugins can render without
 * a full app ThemeProvider in unit tests.
 */
const useStyles = makeStyles({
  root: {
    padding: 24,
  },
  hero: {
    background: `linear-gradient(180deg, ${NEXORA_NAVY_DARK} 0%, ${NEXORA_NAVY} 100%)`,
    borderRadius: 16,
    color: '#F8FAFC',
    marginBottom: 24,
    padding: '28px 28px 24px',
  },
  eyebrow: {
    color: NEXORA_CYAN_LIGHT,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.16em',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 'clamp(26px, 4vw, 36px)',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
    margin: 0,
  },
  principle: {
    color: NEXORA_CYAN_LIGHT,
    fontSize: 18,
    fontWeight: 600,
    marginTop: 10,
  },
  copy: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 1.65,
    marginBottom: 0,
    marginTop: 10,
    maxWidth: 720,
  },
  secondary: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 1.6,
    marginBottom: 0,
    marginTop: 10,
    maxWidth: 760,
  },
  panel: {
    background: NEXORA_CARD,
    border: `1px solid ${NEXORA_BORDER}`,
    borderRadius: 16,
    color: NEXORA_TEXT,
    padding: 20,
  },
  section: {
    background: NEXORA_CARD,
    border: `1px solid ${NEXORA_BORDER}`,
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    color: NEXORA_MUTED,
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.08em',
    margin: '0 0 12px',
    textTransform: 'uppercase',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    borderCollapse: 'collapse',
    minWidth: 720,
    width: '100%',
    '& th': {
      background: '#F8FAFC',
      borderBottom: `1px solid ${NEXORA_BORDER}`,
      color: NEXORA_MUTED,
      fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.06em',
      padding: '12px 14px',
      textAlign: 'left',
      textTransform: 'uppercase',
    },
    '& td': {
      borderBottom: `1px solid ${NEXORA_BORDER}`,
      color: NEXORA_TEXT,
      fontSize: 14,
      lineHeight: 1.5,
      padding: '12px 14px',
      verticalAlign: 'top',
    },
  },
  link: {
    color: NEXORA_NAVY,
    fontWeight: 600,
    textDecoration: 'none',
    '&:hover': {
      color: '#00C2D9',
    },
  },
  summaryCard: {
    background: NEXORA_CARD,
    border: `1px solid ${NEXORA_BORDER}`,
    borderRadius: 16,
    height: '100%',
    padding: '16px 18px',
  },
  summaryLabel: {
    color: NEXORA_MUTED,
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: NEXORA_TEXT,
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 24,
    fontWeight: 600,
    margin: 0,
  },
});

export function useNexoraToolStyles() {
  return useStyles();
}

export function NexoraToolPage({
  eyebrow,
  title,
  principle,
  copy,
  secondary,
  children,
}: {
  eyebrow: string;
  title: string;
  principle?: string;
  copy?: string;
  secondary?: string;
  children: ReactNode;
}) {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <section className={classes.hero} aria-label={title}>
        <p className={classes.eyebrow}>{eyebrow}</p>
        <h1 className={classes.title}>{title}</h1>
        {principle ? <p className={classes.principle}>{principle}</p> : null}
        {copy ? <p className={classes.copy}>{copy}</p> : null}
        {secondary ? <p className={classes.secondary}>{secondary}</p> : null}
      </section>
      <div className={classes.panel}>{children}</div>
    </div>
  );
}

export function NexoraSection({
  title,
  children,
  testId,
}: {
  title: string;
  children: ReactNode;
  testId?: string;
}) {
  const classes = useStyles();
  return (
    <section className={classes.section} data-testid={testId}>
      <h2 className={classes.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

export function NexoraSummaryCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  const classes = useStyles();
  return (
    <div className={classes.summaryCard} data-testid={`summary-${label}`}>
      <div className={classes.summaryLabel}>{label}</div>
      <p className={classes.summaryValue}>{value}</p>
    </div>
  );
}
