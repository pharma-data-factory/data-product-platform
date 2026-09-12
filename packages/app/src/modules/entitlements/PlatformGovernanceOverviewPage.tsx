import {
  Content,
  Header,
  Link,
  Page,
} from '@backstage/core-components';
import { Grid } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { C, PHARMA_NAVY, PHARMA_TEAL, PHARMA_TEAL_DARK } from '../theme/tokens';
import { nexoraThemeColor } from '@internal/plugin-nexora-common';

const useStyles = makeStyles({
  container: {
    maxWidth: 1280,
    margin: '0 auto',
    padding: '24px',
  },
  section: {
    marginBottom: 48,
  },
  intro: {
    color: nexoraThemeColor.textMuted,
    fontSize: 16,
    lineHeight: 1.7,
    margin: 0,
    maxWidth: 800,
  },
  sectionTitle: {
    color: nexoraThemeColor.text,
    fontSize: 24,
    fontWeight: 600,
    margin: '0 0 24px',
  },
  layerCard: {
    background: C.section,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 20,
  },
  featuredLayerCard: {
    background: 'rgba(0, 194, 217, 0.05)',
    border: `2px solid ${PHARMA_TEAL}`,
    borderRadius: 12,
    padding: 20,
  },
  cardTitle: {
    color: PHARMA_NAVY,
    fontSize: 16,
    fontWeight: 600,
    margin: '0 0 8px',
  },
  cardBody: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 1.6,
    margin: 0,
  },
  layerLink: {
    margin: '12px 0 0',
  },
  backstageLink: {
    color: `${PHARMA_TEAL_DARK} !important`,
    fontSize: 13,
    textDecoration: 'none !important',
  },
  workspaceCard: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    color: 'inherit',
    display: 'block',
    padding: 20,
    textDecoration: 'none !important',
    transition: 'border-color 0.2s',
    '&:hover, &:focus-visible': {
      borderColor: PHARMA_TEAL,
    },
  },
  workspaceTitle: {
    color: PHARMA_TEAL_DARK,
    fontSize: 15,
    fontWeight: 600,
    margin: 0,
  },
  workspaceDesc: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 1.5,
    margin: '8px 0 0',
  },
  conceptCard: {
    background: C.section,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 20,
  },
  conceptTitle: {
    color: PHARMA_NAVY,
    fontSize: 15,
    fontWeight: 600,
    margin: 0,
  },
  conceptDesc: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 1.6,
    margin: '8px 0 0',
  },
  modelCard: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 24,
  },
  modelTitle: {
    color: PHARMA_NAVY,
    fontSize: 15,
    fontWeight: 600,
    margin: '0 0 16px',
  },
  list: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 1.8,
    margin: 0,
    paddingLeft: 20,
  },
  dashboardCard: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 24,
  },
  dashboardTitle: {
    color: PHARMA_NAVY,
    fontSize: 15,
    fontWeight: 600,
    margin: '0 0 12px',
  },
  dashboardBody: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 1.6,
    margin: '0 0 12px',
  },
  dashboardLink: {
    color: `${PHARMA_TEAL_DARK} !important`,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none !important',
  },
  statusSection: {
    background: 'rgba(0, 194, 217, 0.08)',
    border: `1px solid ${PHARMA_TEAL}`,
    borderRadius: 12,
    marginBottom: 48,
    padding: 24,
  },
  statusTitle: {
    color: nexoraThemeColor.text,
    fontSize: 18,
    fontWeight: 600,
    margin: '0 0 16px',
  },
  statusCard: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: 16,
  },
  statusLabel: {
    color: PHARMA_TEAL_DARK,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.12em',
    margin: '0 0 8px',
    textTransform: 'uppercase',
  },
  statusValues: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 1.5,
    margin: 0,
  },
  statusNote: {
    color: nexoraThemeColor.textMuted,
    fontSize: 12,
    lineHeight: 1.6,
    margin: '16px 0 0',
  },
  learnMore: {
    background: C.section,
    borderRadius: 12,
    marginBottom: 48,
    padding: 32,
  },
  learnMoreTitle: {
    color: PHARMA_NAVY,
    fontSize: 18,
    fontWeight: 600,
    margin: '0 0 16px',
  },
  learnMoreList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  learnMoreItem: {
    margin: 0,
  },
  learnMoreLink: {
    color: `${PHARMA_TEAL_DARK} !important`,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none !important',
  },
});

export function PlatformGovernanceOverviewPage() {
  const classes = useStyles();

  return (
    <Page themeId="service">
      <Header title="Platform Architecture & Governance" subtitle="How the platform is organized and governed" />
      <Content>
        <div className={classes.container}>
          {/* Intro */}
          <section className={classes.section} aria-label="Introduction">
            <p className={classes.intro}>
              Nexora provides a layered architecture for governing industrial Data Products.
              Use this overview to understand relationships between components, Golden Paths, Data Products,
              and how validation and governance fit together.
            </p>
          </section>

          {/* Architecture Layers */}
          <section className={classes.section} aria-label="Platform Layers">
            <h2 className={classes.sectionTitle}>Platform Layers</h2>
            <Grid container direction="column" spacing={2}>
              <Grid item>
                <div className={classes.layerCard}>
                  <h3 className={classes.cardTitle}>Backstage Foundation</h3>
                  <p className={classes.cardBody}>
                    Open-source Control Plane: Catalog, Scaffolder, TechDocs, Search, Plugin architecture, Identity &amp; RBAC.
                  </p>
                  <p className={classes.layerLink}>
                    <Link className={classes.backstageLink} to="https://backstage.io">
                      Learn about Backstage →
                    </Link>
                  </p>
                </div>
              </Grid>

              <Grid item>
                <div className={classes.featuredLayerCard}>
                  <h3 className={classes.cardTitle}>Nexora</h3>
                  <p className={classes.cardBody}>
                    Industrial Data Product platform layer: Standard, SDK, Components, Contracts, Quality,
                    Compatibility, Golden Paths, Validation &amp; Trust.
                  </p>
                </div>
              </Grid>

              <Grid item>
                <div className={classes.layerCard}>
                  <h3 className={classes.cardTitle}>Governance &amp; Validation</h3>
                  <p className={classes.cardBody}>
                    Traceability, evidence collection, change impact analysis, and formal validation readiness.
                  </p>
                </div>
              </Grid>
            </Grid>
          </section>

          {/* Key Workspaces */}
          <section className={classes.section} aria-label="Key Workspaces and Functions">
            <h2 className={classes.sectionTitle}>Key Workspaces &amp; Functions</h2>
            <Grid container spacing={2}>
              {[
                { label: 'Component Library', href: '/platform-components', desc: 'Reusable technical building blocks' },
                { label: 'Catalog', href: '/catalog', desc: 'System of record for products and relationships' },
                { label: 'Marketplace', href: '/marketplace', desc: 'Discover Golden Paths and templates' },
                { label: 'Create', href: '/create', desc: 'Generate new Data Products from templates' },
                { label: 'Data Products', href: '/data-products', desc: 'View all products, owners, and APIs' },
                { label: 'Validation Expert', href: '/validation-expert', desc: 'Evidence, traceability, and validation' },
              ].map(item => (
                <Grid item xs={12} sm={6} md={4} key={item.label}>
                  <Link className={classes.workspaceCard} to={item.href}>
                    <h3 className={classes.workspaceTitle}>{item.label}</h3>
                    <p className={classes.workspaceDesc}>{item.desc}</p>
                  </Link>
                </Grid>
              ))}
            </Grid>
          </section>

          {/* Understanding Concepts */}
          <section className={classes.section} aria-label="Key Concepts">
            <h2 className={classes.sectionTitle}>Key Concepts</h2>
            <Grid container spacing={3}>
              {[
                {
                  title: 'Platform Components',
                  desc: 'Reusable technical building blocks like REST API, MQTT Consumer, Health, Observability. Wave 1 components are CERTIFIED 1.0.0.'
                },
                {
                  title: 'Golden Paths',
                  desc: 'Certified compositions like MQTT Temperature, REST Equipment, OEE. Official templates for building Data Products.'
                },
                {
                  title: 'Data Products',
                  desc: 'Independent services generated from Golden Paths. Each has owner, contract, quality gates, API, and lifecycle.'
                },
                {
                  title: 'Composition',
                  desc: 'Declares which Platform Components a Data Product uses. Composition manifest is version-controlled.'
                },
                {
                  title: 'Technical Certification',
                  desc: 'DEVELOPMENT → TESTED → CERTIFIED. Means platform conformance only. Not GxP validation.'
                },
                {
                  title: 'Validation & Evidence',
                  desc: 'Technical evidence (tests, CI results, contracts) is created during delivery. Validation Expert connects evidence to requirements.'
                },
              ].map(item => (
                <Grid item xs={12} sm={6} md={4} key={item.title}>
                  <div className={classes.conceptCard}>
                    <h3 className={classes.conceptTitle}>{item.title}</h3>
                    <p className={classes.conceptDesc}>{item.desc}</p>
                  </div>
                </Grid>
              ))}
            </Grid>
          </section>

          {/* Responsibility Model */}
          <section className={classes.section} aria-label="Responsibility Model">
            <h2 className={classes.sectionTitle}>Responsibility Model</h2>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <div className={classes.modelCard}>
                  <h3 className={classes.modelTitle}>Nexora Standardizes</h3>
                  <ul className={classes.list}>
                    <li>Reusable technical components</li>
                    <li>Golden Path structure and CI/CD</li>
                    <li>Contracts and quality conventions</li>
                    <li>Compatibility validation</li>
                    <li>Version metadata</li>
                    <li>Composition patterns</li>
                  </ul>
                </div>
              </Grid>

              <Grid item xs={12} md={6}>
                <div className={classes.modelCard}>
                  <h3 className={classes.modelTitle}>Product Team Owns</h3>
                  <ul className={classes.list}>
                    <li>Intended use and business purpose</li>
                    <li>Domain-specific requirements</li>
                    <li>Business logic implementation</li>
                    <li>Plant and source-system integration</li>
                    <li>Infrastructure and security</li>
                    <li>Risk assessment</li>
                    <li>Validation acceptance</li>
                  </ul>
                </div>
              </Grid>
            </Grid>
          </section>

          {/* Governance Dashboard */}
          <section className={classes.section} aria-label="Admin Dashboard and Monitoring">
            <h2 className={classes.sectionTitle}>Admin Dashboard &amp; Monitoring</h2>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <div className={classes.dashboardCard}>
                  <h3 className={classes.dashboardTitle}>Component Lifecycle</h3>
                  <p className={classes.dashboardBody}>
                    Track platform components from DEVELOPMENT → TESTED → CERTIFIED. Monitor status changes and compatibility impacts.
                  </p>
                  <p className={classes.learnMoreItem}>
                    <Link className={classes.dashboardLink} to="/platform-components">
                      Open Component Library →
                    </Link>
                  </p>
                </div>
              </Grid>

              <Grid item xs={12} md={4}>
                <div className={classes.dashboardCard}>
                  <h3 className={classes.dashboardTitle}>Data Product Status</h3>
                  <p className={classes.dashboardBody}>
                    Monitor all Data Products: Implementation status, Release status, Validation readiness. View composition dependencies.
                  </p>
                  <p className={classes.learnMoreItem}>
                    <Link className={classes.dashboardLink} to="/data-products">
                      Open Data Products →
                    </Link>
                  </p>
                </div>
              </Grid>

              <Grid item xs={12} md={4}>
                <div className={classes.dashboardCard}>
                  <h3 className={classes.dashboardTitle}>Validation Evidence</h3>
                  <p className={classes.dashboardBody}>
                    Central place for traceability, test results, requirements verification, and formal validation sign-off.
                  </p>
                  <p className={classes.learnMoreItem}>
                    <Link className={classes.dashboardLink} to="/validation-expert">
                      Open Validation Expert →
                    </Link>
                  </p>
                </div>
              </Grid>
            </Grid>
          </section>

          {/* Status Model */}
          <section className={classes.statusSection} aria-label="Status Model">
            <h2 className={classes.statusTitle}>Status Model: Four Independent Dimensions</h2>
            <Grid container spacing={2}>
              {[
                { title: 'Implementation', values: 'DEVELOPMENT → TESTED → CERTIFIED' },
                { title: 'Release', values: 'DRAFT → TESTING → RELEASED → RETIRED' },
                { title: 'Commercial', values: 'AVAILABLE, PLANNED, FUTURE, BLOCKED' },
                { title: 'Validation', values: 'NOT VALIDATED → GxP VALIDATED' },
              ].map(item => (
                <Grid item xs={12} sm={6} md={3} key={item.title}>
                  <div className={classes.statusCard}>
                    <p className={classes.statusLabel}>{item.title}</p>
                    <p className={classes.statusValues}>{item.values}</p>
                  </div>
                </Grid>
              ))}
            </Grid>
            <p className={classes.statusNote}>
              <strong>Important:</strong> These dimensions must never be collapsed. A CERTIFIED component is not GxP VALIDATED.
              A RELEASED product may be PLANNED for commercial availability. Status model clarity prevents validation confusion.
            </p>
          </section>

          {/* More Info */}
          <section className={classes.learnMore} aria-label="Learn More">
            <h2 className={classes.learnMoreTitle}>Learn More</h2>
            <div className={classes.learnMoreList}>
              <p className={classes.learnMoreItem}>
                <Link className={classes.learnMoreLink} to="/platform/architecture">
                  View the full public architecture story →
                </Link>
              </p>
              <p className={classes.learnMoreItem}>
                <Link className={classes.learnMoreLink} to="/platform/architecture/developer">
                  Developer technical architecture →
                </Link>
              </p>
              <p className={classes.learnMoreItem}>
                <Link className={classes.learnMoreLink} to="/developer">
                  Developer Hub (authenticated) →
                </Link>
              </p>
            </div>
          </section>
        </div>
      </Content>
    </Page>
  );
}
