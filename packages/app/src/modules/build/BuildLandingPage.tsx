import { useEffect, useMemo, useState } from 'react';
import { Content, Link, Page } from '@backstage/core-components';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import { Box, Chip, Grid, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  PlatformRole,
  canExecuteScaffolder,
  releaseCatalogRows,
  resolvePlatformRole,
} from '@internal/platform-common';
import { C, PHARMA_NAVY, PHARMA_NAVY_DARK, PHARMA_TEAL, PHARMA_TEAL_DARK, PHARMA_TEAL_LIGHT } from '../theme/tokens';
import {
  NEXORA_CARD,
  NEXORA_GREY,
  NEXORA_SECURITY_FG,
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
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
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
    padding: '9px 16px',
    textDecoration: 'none',
    textTransform: 'none',
    '&:hover': {
      background: PHARMA_TEAL_DARK,
      borderColor: PHARMA_TEAL_DARK,
      textDecoration: 'none',
    },
  },
  ghostAction: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.28)',
    borderRadius: 10,
    color: `${NEXORA_GREY[50]} !important`,
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: 600,
    padding: '9px 16px',
    textDecoration: 'none',
    textTransform: 'none',
    '&:hover': {
      background: 'rgba(0,194,217,0.14)',
      borderColor: PHARMA_TEAL_LIGHT,
      textDecoration: 'none',
    },
  },
  section: {
    marginTop: 32,
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
  sectionTitle: {
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 24,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    margin: 0,
  },
  muted: {
    color: C.muted,
    marginBottom: 0,
    marginTop: 8,
    maxWidth: 760,
  },
  gpCard: {
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
  gpHead: {
    alignItems: 'flex-start',
    display: 'flex',
    gap: 8,
    justifyContent: 'space-between',
  },
  gpName: {
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1.3,
  },
  gpMeta: {
    color: C.muted,
    fontSize: 13,
  },
  explore: {
    color: PHARMA_TEAL_DARK,
    fontSize: 13,
    fontWeight: 600,
    marginTop: 'auto',
    paddingTop: 12,
  },
  resourceCard: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    color: `${C.text} !important`,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    height: '100%',
    padding: 18,
    textDecoration: 'none !important',
    transition: 'border-color 120ms ease, box-shadow 120ms ease',
    '&:hover, &:focus-visible': {
      borderColor: PHARMA_TEAL,
      boxShadow: '0 8px 24px rgba(11, 31, 58, 0.08)',
      outline: 'none',
      textDecoration: 'none',
    },
  },
  resourceTitle: {
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
  },
  resourceCopy: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 1.6,
  },
  advanced: {
    borderColor: 'rgba(255, 138, 0, 0.4)',
  },
  advancedPill: {
    background: 'rgba(255, 138, 0, 0.12)',
    borderRadius: 999,
    color: NEXORA_SECURITY_FG,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    marginLeft: 8,
    padding: '3px 8px',
    textTransform: 'uppercase',
  },
});
export function BuildLandingPage() {
  const classes = useStyles();
  const identityApi = useApi(identityApiRef);
  const [role, setRole] = useState<PlatformRole>('VIEWER');

  useEffect(() => {
    let active = true;
    identityApi
      .getBackstageIdentity()
      .then(identity => {
        if (active) {
          setRole(resolvePlatformRole(identity.ownershipEntityRefs));
        }
      })
      .catch(() => {
        if (active) {
          setRole('VIEWER');
        }
      });
    return () => {
      active = false;
    };
  }, [identityApi]);

  const goldenPaths = useMemo(() => releaseCatalogRows(), []);
  const canCreate = canExecuteScaffolder(role);

  return (
    <Page themeId="tool">
      <Content>
        <section className={classes.hero} aria-label="Build a Data Product">
          <p className={classes.eyebrow}>BUILD · START HERE</p>
          <h1 className={classes.title}>Build a Data Product</h1>
          <p className={classes.copy}>
            Start from a recommended, tested Golden Path. Configure, generate, and
            deliver — without needing to know the platform internals.
          </p>
          <div className={classes.actions}>
            <Link className={classes.action} to={canCreate ? '/create' : '/releases'}>
              {canCreate ? 'Start Building' : 'Choose a Golden Path'}
            </Link>
            <Link className={classes.ghostAction} to="/my-products">
              My Products
            </Link>
          </div>
        </section>

        <section className={classes.section} aria-label="Golden Paths">
          <Typography className={classes.sectionLabel}>Recommended</Typography>
          <Typography className={classes.sectionTitle} variant="h2">
            Golden Paths
          </Typography>
          <Typography variant="body2" className={classes.muted}>
            Golden Paths are the recommended, tested implementation blueprints. Each
            one configures an official Data Product through the standard Create flow.
          </Typography>
          <Box marginTop={2}>
            <Grid container spacing={3}>
              {goldenPaths.map(gp => (
                <Grid item xs={12} md={4} key={gp.template}>
                  <Link className={classes.gpCard} to={`/releases/${gp.template}`}>
                    <div className={classes.gpHead}>
                      <span className={classes.gpName}>{gp.name}</span>
                      <Chip label={gp.lifecycle} size="small" />
                    </div>
                    <span className={classes.gpMeta}>
                      v{gp.version} · {gp.certification}
                    </span>
                    <span className={classes.explore}>Open Golden Path</span>
                  </Link>
                </Grid>
              ))}
            </Grid>
          </Box>
        </section>
        <section className={classes.section} aria-label="Reusable Building Blocks">
          <Typography className={classes.sectionLabel}>Reusable Building Blocks</Typography>
          <Typography className={classes.sectionTitle} variant="h2">
            Platform Components
          </Typography>
          <Box marginTop={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Link className={classes.resourceCard} to="/platform-components">
                  <span className={classes.resourceTitle}>Platform Components</span>
                  <span className={classes.resourceCopy}>
                    Discover, understand, reuse, and compose certified building blocks
                    across the platform.
                  </span>
                </Link>
              </Grid>
              <Grid item xs={12} md={6}>
                <Link className={classes.resourceCard} to="/assets">
                  <span className={classes.resourceTitle}>Assets &amp; Sensors</span>
                  <span className={classes.resourceCopy}>
                    Explore industrial assets and their live properties.
                  </span>
                </Link>
              </Grid>
            </Grid>
          </Box>
        </section>

        <section className={classes.section} aria-label="Advanced">
          <Typography className={classes.sectionLabel}>Advanced</Typography>
          <Typography className={classes.sectionTitle} variant="h2">
            Composition Builder
          </Typography>
          <Box marginTop={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Link className={`${classes.resourceCard} ${classes.advanced}`} to="/compose">
                  <span className={classes.resourceTitle}>
                    Composition Builder
                    <span className={classes.advancedPill}>Advanced</span>
                  </span>
                  <span className={classes.resourceCopy}>
                    Assemble a Data Product from platform components when you need more
                    flexibility than an existing Golden Path provides.
                  </span>
                </Link>
              </Grid>
            </Grid>
          </Box>
        </section>

        <section className={classes.section} aria-label="Developer Resources">
          <Typography className={classes.sectionLabel}>Developer Resources</Typography>
          <Typography className={classes.sectionTitle} variant="h2">
            Guidance &amp; Documentation
          </Typography>
          <Box marginTop={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Link className={classes.resourceCard} to="/developer">
                  <span className={classes.resourceTitle}>Developer Hub</span>
                  <span className={classes.resourceCopy}>
                    Development, architecture, and component guidance.
                  </span>
                </Link>
              </Grid>
              <Grid item xs={12} md={3}>
                <Link className={classes.resourceCard} to="/releases">
                  <span className={classes.resourceTitle}>Release Catalog</span>
                  <span className={classes.resourceCopy}>
                    Official Golden Path versions and release notes.
                  </span>
                </Link>
              </Grid>
              <Grid item xs={12} md={3}>
                <Link className={classes.resourceCard} to="/search">
                  <span className={classes.resourceTitle}>Search Documentation</span>
                  <span className={classes.resourceCopy}>
                    Find technical documentation across the platform.
                  </span>
                </Link>
              </Grid>
              <Grid item xs={12} md={3}>
                <Link className={classes.resourceCard} to="/plugin-directory">
                  <span className={classes.resourceTitle}>Plugin Directory</span>
                  <span className={classes.resourceCopy}>
                    Inventory of registered platform plugins.
                  </span>
                </Link>
              </Grid>
            </Grid>
          </Box>
        </section>
      </Content>
    </Page>
  );
}

