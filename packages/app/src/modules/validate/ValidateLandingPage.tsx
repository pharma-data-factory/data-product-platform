import { Content, Link, Page } from '@backstage/core-components';
import { Box, Grid, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { C, PHARMA_NAVY, PHARMA_NAVY_DARK, PHARMA_TEAL_DARK, PHARMA_TEAL_LIGHT } from '../theme/tokens';
import {
  NEXORA_GREY,
} from '@internal/plugin-nexora-common';

const STEPS = [
  'Business Need',
  'URS',
  'Approved Baseline',
  'Validation',
  'Evidence',
];

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
      borderColor: PHARMA_TEAL_DARK,
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
  flow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  step: {
    background: C.section,
    border: `1px solid ${C.border}`,
    borderRadius: 999,
    color: C.text,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 14px',
  },
  arrow: {
    alignSelf: 'center',
    color: C.muted,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 12,
  },
  note: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 1.6,
    marginTop: 18,
    maxWidth: 780,
  },
});
export function ValidateLandingPage() {
  const classes = useStyles();
  return (
    <Page themeId="tool">
      <Content>
        <section className={classes.hero} aria-label="Validate">
          <p className={classes.eyebrow}>VALIDATE · QUALIFY</p>
          <h1 className={classes.title}>Validate</h1>
          <p className={classes.copy}>
            Manage requirements and validation as one coherent flow — from business
            need to approved baseline through validation evidence.
          </p>
        </section>

        <section>
          <Typography className={classes.sectionLabel}>The flow</Typography>
          <Box marginTop={2} className={classes.flow}>
            {STEPS.map((step, index) => (
              <Box key={step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={classes.step}>{step}</span>
                {index < STEPS.length - 1 && (
                  <span className={classes.arrow}>→</span>
                )}
              </Box>
            ))}
          </Box>
        </section>

        <section style={{ marginTop: 32 }}>
          <Typography className={classes.sectionLabel}>Validate</Typography>
          <Box marginTop={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Link className={classes.card} to="/urs-composer">
                  <span className={classes.cardTitle}>URS Composer</span>
                  <span className={classes.cardCopy}>
                    Capture and structure User Requirements Specifications and
                    approve a baseline.
                  </span>
                  <span className={classes.explore}>Open URS Composer</span>
                </Link>
              </Grid>
              <Grid item xs={12} md={6}>
                <Link className={classes.card} to="/validation-expert">
                  <span className={classes.cardTitle}>Validation Expert</span>
                  <span className={classes.cardCopy}>
                    Plan and execute validation, trace requirements, and review
                    evidence.
                  </span>
                  <span className={classes.explore}>Open Validation Expert</span>
                </Link>
              </Grid>
            </Grid>
          </Box>
          <Typography variant="body2" className={classes.note}>
            URS Composer and Validation Expert are the two halves of the same
            validation intent. Technical status only — not a GxP or compliance
            claim.
          </Typography>
        </section>
      </Content>
    </Page>
  );
}

