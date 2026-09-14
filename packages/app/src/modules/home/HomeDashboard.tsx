import { Link } from '@backstage/core-components';
import { Grid, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import type { DataProduct } from '@internal/plugin-data-products';
import { PlatformRole, isAtLeast } from '@internal/platform-common';
import { C, PHARMA_NAVY, PHARMA_NAVY_DARK, PHARMA_TEAL, PHARMA_TEAL_DARK, PHARMA_TEAL_LIGHT } from '../theme/tokens';
import {
  NEXORA_CARD,
  NEXORA_GREY,
} from '@internal/plugin-nexora-common';

const BUILDER_ACTIONS = [
  { id: 'build', to: '/build', label: 'Build', copy: 'Create a Data Product using a guided Golden Path.', primary: true },
  { id: 'products', to: '/my-products', label: 'My Products', copy: 'View existing Data Products.' },
  { id: 'validate', to: '/validate', label: 'Validate', copy: 'Manage requirements and validation.' },
];

const VIEWER_ACTIONS = [
  { id: 'marketplace', to: '/marketplace', label: 'Marketplace', copy: 'Discover reusable solutions.', primary: true },
  { id: 'products', to: '/my-products', label: 'My Products', copy: 'View existing Data Products.' },
  { id: 'model-company', to: '/model-company', label: 'Model Company', copy: 'Explore the reference manufacturing environment.' },
];

function actionsFor(role: PlatformRole) {
  return role === 'VIEWER' ? VIEWER_ACTIONS : BUILDER_ACTIONS;
}

const MAX_PRODUCTS = 6;

function heroFor(role: PlatformRole): {
  copy: string;
  cta: { to: string; label: string };
} {
  if (role === 'VIEWER') {
    return {
      copy: 'Explore certified Data Products and the reference manufacturing environment.',
      cta: { to: '/marketplace', label: 'Explore Marketplace' },
    };
  }
  if (isAtLeast(role, 'PLATFORM_ADMIN')) {
    return {
      copy: 'Operate the platform: manage users, entitlements, and platform health.',
      cta: { to: '/admin', label: 'Manage Platform' },
    };
  }
  return {
    copy: 'Build, validate, and operate Data Products for life science. Start by creating a Data Product on a certified Golden Path.',
    cta: { to: '/build', label: 'Build a Data Product' },
  };
}

const useStyles = makeStyles({
  hero: {
    background: `linear-gradient(180deg, ${PHARMA_NAVY_DARK} 0%, ${PHARMA_NAVY} 100%)`,
    borderRadius: 16,
    color: NEXORA_GREY[50],
    marginBottom: 24,
    padding: '28px 28px',
  },
  eyebrow: {
    color: PHARMA_TEAL_LIGHT,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.16em',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  welcome: {
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 'clamp(24px, 3.4vw, 34px)',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
    margin: 0,
  },
  copy: {
    color: NEXORA_GREY[300],
    fontSize: 15,
    lineHeight: 1.7,
    marginBottom: 0,
    marginTop: 12,
    maxWidth: 720,
  },
  cta: {
    background: PHARMA_TEAL,
    border: `1px solid ${PHARMA_TEAL}`,
    borderRadius: 10,
    color: `${NEXORA_CARD} !important`,
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 14,
    fontWeight: 600,
    marginTop: 20,
    padding: '11px 20px',
    textDecoration: 'none',
    textTransform: 'none',
    '&:hover': {
      background: PHARMA_TEAL_DARK,
      borderColor: PHARMA_TEAL_DARK,
      textDecoration: 'none',
    },
  },
  sectionLabel: {
    color: PHARMA_TEAL_DARK,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.16em',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    color: `${C.text} !important`,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    height: '100%',
    minHeight: 150,
    padding: 20,
    textDecoration: 'none !important',
    transition: 'border-color 120ms ease, box-shadow 120ms ease',
    '&:hover, &:focus-visible': {
      borderColor: PHARMA_TEAL,
      boxShadow: '0 8px 24px rgba(11, 31, 58, 0.08)',
      outline: 'none',
      textDecoration: 'none',
    },
  },
  primaryCard: {
    background: `linear-gradient(135deg, ${PHARMA_TEAL}, ${PHARMA_TEAL_DARK})`,
    border: 'none',
    color: `${NEXORA_CARD} !important`,
    '&:hover, &:focus-visible': {
      boxShadow: '0 10px 28px rgba(0, 194, 217, 0.28)',
    },
  },
  primaryLabel: {
    color: `${NEXORA_CARD} !important`,
  },
  primaryCopy: {
    color: '#E6FBFF !important',
  },
  primaryExplore: {
    color: `${NEXORA_CARD} !important`,
  },
  cardLabel: {
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1.3,
  },
  cardCopy: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 1.6,
  },
  explore: {
    color: PHARMA_TEAL_DARK,
    fontSize: 13,
    fontWeight: 600,
    marginTop: 'auto',
    paddingTop: 12,
  },
  product: {
    borderTop: `1px solid ${C.border}`,
    marginTop: 6,
    paddingTop: 10,
  },
  empty: {
    color: C.muted,
    fontSize: 14,
    marginTop: 8,
  },
  viewAll: {
    color: PHARMA_TEAL_DARK,
    display: 'inline-block',
    fontSize: 13,
    fontWeight: 600,
    marginTop: 12,
  },
  recentCard: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    height: '100%',
    padding: '14px 16px',
    textDecoration: 'none !important',
    transition: 'border-color 120ms ease',
    '&:hover, &:focus-visible': {
      borderColor: PHARMA_TEAL,
      outline: 'none',
      textDecoration: 'none',
    },
  },
  recentTitle: {
    color: `${C.text} !important`,
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 15,
    fontWeight: 600,
    lineHeight: 1.3,
  },
  recentMeta: {
    color: C.muted,
    fontSize: 12,
    letterSpacing: '0.04em',
  },
});
export interface HomeDashboardProps {
  platformRole: PlatformRole;
  displayName?: string;
  picture?: string;
  githubLogin?: string;
  products: DataProduct[];
  recentlyUsed: DataProduct[];
}

export function HomeDashboard({
  displayName,
  platformRole,
  products,
  recentlyUsed,
}: HomeDashboardProps) {
  const classes = useStyles();
  const hero = heroFor(platformRole);
  const browse = products
    .filter(product => !recentlyUsed.includes(product))
    .slice(0, MAX_PRODUCTS);
  const totalShown = recentlyUsed.length + browse.length;

  return (
    <>
      <section className={classes.hero} aria-label="Nexora">
        <p className={classes.eyebrow}>NEXORA</p>
        <h1 className={classes.welcome}>
          {displayName ? `Welcome, ${displayName}` : 'Nexora'}
        </h1>
        <p className={classes.copy}>{hero.copy}</p>
        <Link className={classes.cta} to={hero.cta.to}>
          {hero.cta.label}
        </Link>
      </section>

      <section aria-label="What can I do">
        <Typography className={classes.sectionLabel}>What can I do?</Typography>
        <Grid container spacing={3}>
          {actionsFor(platformRole).map(action => (
            <Grid item xs={12} sm={6} md={4} key={action.id}>
              <Link
                className={`${classes.card} ${action.primary ? classes.primaryCard : ''}`}
                to={action.to}
                data-primary={action.primary ? 'true' : 'false'}
              >
                <span
                  className={`${classes.cardLabel} ${
                    action.primary ? classes.primaryLabel : ''
                  }`}
                >
                  {action.label}
                </span>
                <span
                  className={`${classes.cardCopy} ${
                    action.primary ? classes.primaryCopy : ''
                  }`}
                >
                  {action.copy}
                </span>
                <span
                  className={`${classes.explore} ${
                    action.primary ? classes.primaryExplore : ''
                  }`}
                >
                  Open
                </span>
              </Link>
            </Grid>
          ))}
        </Grid>
      </section>

      {recentlyUsed.length > 0 && (
        <section aria-label="Continue where you left off" style={{ marginTop: 32 }}>
          <Typography className={classes.sectionLabel}>
            Continue where you left off
          </Typography>
          <Grid container spacing={2}>
            {recentlyUsed.map(product => (
              <Grid item xs={12} sm={6} md={3} key={product.name}>
                <Link
                  className={classes.recentCard}
                  to={`/data-products/${product.name}`}
                >
                  <span className={classes.recentTitle}>{product.title}</span>
                  <span className={classes.recentMeta}>{product.qualityStatus}</span>
                </Link>
              </Grid>
            ))}
          </Grid>
        </section>
      )}

      <section aria-label="My Data Products" style={{ marginTop: 32 }}>
        <Typography className={classes.sectionLabel}>My Data Products</Typography>
        {products.length === 0 ? (
          <Typography variant="body2" className={classes.empty}>
            No Data Products yet. Start with a Golden Path to create your first one.
          </Typography>
        ) : (
          <>
            {browse.map(product => (
              <Typography key={product.name} variant="body2" className={classes.product}>
                <Link to={`/data-products/${product.name}`}>{product.title}</Link>
              </Typography>
            ))}
            {products.length > totalShown && (
              <Link to="/my-products" className={classes.viewAll}>
                View all Data Products →
              </Link>
            )}
          </>
        )}
      </section>
    </>
  );
}

