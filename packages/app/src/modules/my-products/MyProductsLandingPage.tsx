import { Content, Link, Page } from '@backstage/core-components';
import { Box, Grid, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { C, PHARMA_NAVY, PHARMA_NAVY_DARK, PHARMA_TEAL, PHARMA_TEAL_DARK, PHARMA_TEAL_LIGHT } from '../theme/tokens';
import {
  NEXORA_CARD,
  NEXORA_GREY,
} from '@internal/plugin-nexora-common';

const useStyles = makeStyles({
  hero: {
    background: `linear-gradient(180deg, ${PHARMA_NAVY_DARK} 0%, ${PHARMA_NAVY} 100%)`,
    borderRadius: 16,
    color: NEXORA_GREY[50],
    marginBottom: 28,
    padding: '32px 28px',
  },
  eyebrow: {
    color: PHARMA_TEAL_LIGHT,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.16em',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 'clamp(28px, 4vw, 40px)',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
    margin: 0,
  },
  copy: {
    color: NEXORA_GREY[300],
    fontSize: 16,
    lineHeight: 1.7,
    marginBottom: 0,
    marginTop: 12,
    maxWidth: 720,
  },
  action: {
    background: PHARMA_TEAL,
    border: `1px solid ${PHARMA_TEAL}`,
    borderRadius: 10,
    color: `${NEXORA_CARD} !important`,
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: 600,
    marginTop: 20,
    padding: '9px 16px',
    textDecoration: 'none',
    textTransform: 'none',
    '&:hover': {
      background: PHARMA_TEAL_DARK,
      borderColor: PHARMA_TEAL_DARK,
      textDecoration: 'none',
    },
  },
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    color: `${C.text} !important`,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    height: '100%',
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
  cardTitle: {
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1.3,
  },
  cardCopy: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 1.65,
  },
  explore: {
    color: PHARMA_TEAL_DARK,
    fontSize: 13,
    fontWeight: 600,
    marginTop: 'auto',
    paddingTop: 12,
  },
  sectionLabel: {
    color: PHARMA_TEAL_DARK,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.16em',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  note: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 1.6,
    marginTop: 16,
    maxWidth: 780,
  },
});
export function MyProductsLandingPage() {
  const classes = useStyles();
  return (
    <Page themeId="home">
      <Content>
        <section className={classes.hero} aria-label="My Products">
          <p className={classes.eyebrow}>MY PRODUCTS · OPERATE</p>
          <h1 className={classes.title}>My Products</h1>
          <p className={classes.copy}>
            Explore the Data Products you own and the full Software Catalog behind
            them.
          </p>
          <Link className={classes.action} to="/data-products">
            Open My Data Products
          </Link>
        </section>

        <section>
          <Typography className={classes.sectionLabel}>Explore</Typography>
          <Box marginTop={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Link className={classes.card} to="/data-products">
                  <span className={classes.cardTitle}>Data Products</span>
                  <span className={classes.cardCopy}>
                    A product-oriented view of the Data Products available to you,
                    their quality, certification, and upgrades.
                  </span>
                  <span className={classes.explore}>Open Data Products</span>
                </Link>
              </Grid>
              <Grid item xs={12} md={6}>
                <Link className={classes.card} to="/catalog">
                  <span className={classes.cardTitle}>Catalog</span>
                  <span className={classes.cardCopy}>
                    The full Backstage Software Catalog — every component, system,
                    and entity in the platform.
                  </span>
                  <span className={classes.explore}>Open Catalog</span>
                </Link>
              </Grid>
            </Grid>
          </Box>
          <Typography variant="body2" className={classes.note}>
            Data Products is the recommended product view. Catalog remains the
            standard, authoritative Backstage entity view.
          </Typography>
        </section>

        <section style={{ marginTop: 32 }}>
          <Typography className={classes.sectionLabel}>More product views</Typography>
          <Box marginTop={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <Link className={classes.card} to="/contracts">
                  <span className={classes.cardTitle}>Contracts</span>
                  <span className={classes.cardCopy}>
                    Commercial contracts and compatibility for Data Products.
                  </span>
                  <span className={classes.explore}>Open</span>
                </Link>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Link className={classes.card} to="/quality">
                  <span className={classes.cardTitle}>Quality</span>
                  <span className={classes.cardCopy}>
                    Quality status and health for Data Products.
                  </span>
                  <span className={classes.explore}>Open</span>
                </Link>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Link className={classes.card} to="/equipment">
                  <span className={classes.cardTitle}>Equipment</span>
                  <span className={classes.cardCopy}>
                    Industrial equipment and connection status.
                  </span>
                  <span className={classes.explore}>Open</span>
                </Link>
              </Grid>
            </Grid>
          </Box>
        </section>
      </Content>
    </Page>
  );
}

