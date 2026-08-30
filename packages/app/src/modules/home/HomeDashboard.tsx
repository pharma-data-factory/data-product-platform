import { Link } from '@backstage/core-components';
import { Grid, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import type { DataProduct } from '@internal/plugin-data-products';
import { C, PHARMA_NAVY, PHARMA_NAVY_DARK, PHARMA_TEAL, PHARMA_TEAL_DARK, PHARMA_TEAL_LIGHT } from '../theme/tokens';

const ACTIONS = [
  { id: 'build', to: '/build', label: 'Build', copy: 'Create a Data Product using a guided Golden Path.', primary: true },
  { id: 'products', to: '/my-products', label: 'My Products', copy: 'View existing Data Products.' },
  { id: 'validate', to: '/validate', label: 'Validate', copy: 'Manage requirements and validation.' },
  { id: 'marketplace', to: '/marketplace', label: 'Marketplace', copy: 'Discover reusable solutions.' },
  { id: 'model-company', to: '/model-company', label: 'Model Company', copy: 'Explore the reference manufacturing environment.' },
];

const useStyles = makeStyles({
  hero: {
    background: `linear-gradient(180deg, ${PHARMA_NAVY_DARK} 0%, ${PHARMA_NAVY} 100%)`,
    borderRadius: 16,
    color: '#F8FAFC',
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
    color: '#CBD5E1',
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
    color: '#FFFFFF !important',
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
    color: '#FFFFFF !important',
    '&:hover, &:focus-visible': {
      boxShadow: '0 10px 28px rgba(0, 194, 217, 0.28)',
    },
  },
  primaryLabel: {
    color: '#FFFFFF !important',
  },
  primaryCopy: {
    color: '#E6FBFF !important',
  },
  primaryExplore: {
    color: '#FFFFFF !important',
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
});
export interface HomeDashboardProps {
  platformRole: string;
  displayName?: string;
  picture?: string;
  githubLogin?: string;
  products: DataProduct[];
  recentlyUsed: DataProduct[];
}

export function HomeDashboard({ displayName, products }: HomeDashboardProps) {
  const classes = useStyles();
  return (
    <>
      <section className={classes.hero} aria-label="Pharma Data Factory">
        <p className={classes.eyebrow}>PHARMA DATA FACTORY</p>
        <h1 className={classes.welcome}>
          {displayName ? `Welcome, ${displayName}` : 'Pharma Data Factory'}
        </h1>
        <p className={classes.copy}>
          Build, validate, and operate Data Products for life science. Start by
          creating a Data Product on a certified Golden Path.
        </p>
        <Link className={classes.cta} to="/build">
          Build a Data Product
        </Link>
      </section>

      <section aria-label="What can I do">
        <Typography className={classes.sectionLabel}>What can I do?</Typography>
        <Grid container spacing={3}>
          {ACTIONS.map(action => (
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

      <section aria-label="My Data Products" style={{ marginTop: 32 }}>
        <Typography className={classes.sectionLabel}>My Data Products</Typography>
        {products.length === 0 ? (
          <Typography variant="body2" className={classes.empty}>
            No Data Products yet. Start with a Golden Path to create your first one.
          </Typography>
        ) : (
          products.map(product => (
            <Typography key={product.name} variant="body2" className={classes.product}>
              <Link to={`/data-products/${product.name}`}>{product.title}</Link>
            </Typography>
          ))
        )}
      </section>
    </>
  );
}

