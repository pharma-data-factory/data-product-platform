import { Content, Link, Page } from '@backstage/core-components';
import { Box, Grid, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { C, PHARMA_NAVY, PHARMA_NAVY_DARK, PHARMA_TEAL_DARK, PHARMA_TEAL_LIGHT } from '../theme/tokens';

const ADMIN_LINKS = [
  {
    title: 'Entitlements',
    to: '/admin/entitlements',
    copy: 'Manage commercial entitlements and platform access.',
  },
  {
    title: 'Marketplace Integration',
    to: '/admin/marketplace-integration',
    copy: 'Configure marketplace integration and distribution.',
  },
  {
    title: 'Platform Architecture',
    to: '/admin/platform-architecture',
    copy: 'Review platform architecture and governance overview.',
  },
  {
    title: 'Plugin Directory',
    to: '/plugin-directory',
    copy: 'Inventory of registered platform plugins.',
  },
];

const useStyles = makeStyles({
  hero: {
    background: `linear-gradient(180deg, ${PHARMA_NAVY_DARK} 0%, ${PHARMA_NAVY} 100%)`,
    borderRadius: 16,
    color: '#F8FAFC',
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
    color: '#CBD5E1',
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
    fontSize: 17,
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
    marginTop: 18,
    maxWidth: 780,
  },
});
export function AdminLandingPage() {
  const classes = useStyles();
  return (
    <Page themeId="tool">
      <Content>
        <section className={classes.hero} aria-label="Admin">
          <p className={classes.eyebrow}>ADMINISTRATION</p>
          <h1 className={classes.title}>Admin</h1>
          <p className={classes.copy}>
            Platform administration — separated from the normal developer build
            journey.
          </p>
        </section>

        <section>
          <Typography className={classes.sectionLabel}>Administration</Typography>
          <Box marginTop={2}>
            <Grid container spacing={3}>
              {ADMIN_LINKS.map(item => (
                <Grid item xs={12} sm={6} md={4} key={item.to}>
                  <Link className={classes.card} to={item.to}>
                    <span className={classes.cardTitle}>{item.title}</span>
                    <span className={classes.cardCopy}>{item.copy}</span>
                    <span className={classes.explore}>Open</span>
                  </Link>
                </Grid>
              ))}
            </Grid>
          </Box>
          <Typography variant="body2" className={classes.note}>
            Authorization Registry is platform metadata/configuration with no
            standalone frontend page in this build. Authorization is enforced by
            the platform permission policy (Catalog groups → platform roles).
          </Typography>
        </section>
      </Content>
    </Page>
  );
}

