import { ReactNode, forwardRef } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Button, Chip, makeStyles } from '@material-ui/core';
import { NX } from './visual/styles';
import {
  NEXORA_GREY,
} from '@internal/plugin-nexora-common';

const RouterLinkRef = forwardRef<HTMLAnchorElement, React.ComponentProps<typeof RouterLink>>(
  (props, ref) => <RouterLink {...props} ref={ref} />,
);

const useStyles = makeStyles({
  root: { padding: 24, maxWidth: 1280, margin: '0 auto' },
  hero: {
    background: `linear-gradient(180deg, ${NX.navyDark} 0%, ${NX.navy} 100%)`,
    borderRadius: 16,
    color: NEXORA_GREY[50],
    marginBottom: 20,
    padding: '24px 28px 20px',
  },
  labels: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  eyebrow: {
    color: NX.teal,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.16em',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 'clamp(24px, 3.5vw, 34px)',
    fontWeight: 600,
    margin: 0,
  },
  subtitle: { color: NEXORA_GREY[400], marginTop: 8, marginBottom: 0, fontSize: 14 },
  nav: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  navSecondary: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 20,
  },
  panel: {
    background: NX.card,
    border: `1px solid ${NX.border}`,
    borderRadius: 12,
    padding: 20,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
    marginTop: 16,
  },
  metric: {
    background: NX.base,
    borderRadius: 10,
    padding: '12px 14px',
  },
  metricLabel: { color: NX.muted, fontSize: 12, marginBottom: 4 },
  metricValue: { color: NX.text, fontSize: 20, fontWeight: 600 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 },
});

/** Primary Factory Operations navigation (required IA). */
const PRIMARY_NAV = [
  { to: '/model-company', label: 'Overview' },
  { to: '/model-company/factory', label: 'Factory' },
  { to: '/model-company/lines', label: 'Lines' },
  { to: '/model-company/material-flow', label: 'Material Flow' },
  { to: '/model-company/batches', label: 'Batches' },
  { to: '/model-company/scenarios', label: 'Scenarios' },
];

const SECONDARY_NAV = [
  { to: '/model-company/campaign', label: 'Campaign' },
  { to: '/model-company/equipment', label: 'Equipment' },
  { to: '/model-company/uns', label: 'UNS' },
  { to: '/model-company/data-products', label: 'Data Products' },
  { to: '/model-company/events', label: 'Events' },
  { to: '/model-company/architecture', label: 'Architecture' },
];

export function ModelCompanyChrome({
  title,
  subtitle,
  companyName,
  siteId,
  children,
  actions,
  publicMode = false,
}: {
  title?: string;
  subtitle?: string;
  companyName?: string;
  siteId?: string;
  children: ReactNode;
  actions?: ReactNode;
  publicMode?: boolean;
}) {
  const classes = useStyles();
  const location = useLocation();

  return (
    <div className={classes.root}>
      <div className={classes.hero}>
        <div className={classes.labels}>
          <Chip
            size="small"
            label="SYNTHETIC"
            style={{ background: NX.warnBg, color: NX.warnFg, fontWeight: 700 }}
          />
          <Chip
            size="small"
            label="NON-GXP"
            style={{ background: NX.warnBg, color: NX.warnFg, fontWeight: 700 }}
          />
        </div>
        <div className={classes.eyebrow}>{companyName ?? 'Nexora Model Pharma'}</div>
        <h1 className={classes.title}>{title ?? 'Factory Operations View'}</h1>
        <p className={classes.subtitle}>
          {subtitle ??
            `${siteId ?? 'Site'} · Model Factory · Customer Zero · UNS-native`}
        </p>
        {actions}
      </div>
      {!publicMode && (
        <>
          <nav className={classes.nav} aria-label="Model Company primary">
            {PRIMARY_NAV.map(item => {
              const active =
                item.to === '/model-company'
                  ? location.pathname === '/model-company'
                  : location.pathname.startsWith(item.to);
              return (
                <Button
                  key={item.to}
                  component={RouterLinkRef}
                  to={item.to}
                  size="small"
                  variant={active ? 'contained' : 'outlined'}
                  color={active ? 'primary' : 'default'}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Button>
              );
            })}
          </nav>
          <nav className={classes.navSecondary} aria-label="Model Company tools">
            {SECONDARY_NAV.map(item => (
              <Button
                key={item.to}
                component={RouterLinkRef}
                to={item.to}
                size="small"
                variant="text"
              >
                {item.label}
              </Button>
            ))}
          </nav>
        </>
      )}
      <div className={classes.panel}>{children}</div>
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string | number }) {
  const classes = useStyles();
  return (
    <div className={classes.metric}>
      <div className={classes.metricLabel}>{label}</div>
      <div className={classes.metricValue}>{value}</div>
    </div>
  );
}

export function useModelCompanyStyles() {
  return useStyles();
}

/** @deprecated use visual/styles NX */
export { NX };
