import { useEffect, useState } from 'react';
import { Content, Link, Page } from '@backstage/core-components';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import { Grid, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  ARCHITECTURE_STORY_PATH,
  DEVELOPER_HUB_SECTIONS,
  DOC_SEARCH_KINDS,
  FIRST_DAY_STEPS,
  HUB_GOLDEN_PATHS,
  LAST_REVIEWED,
  OEE_DIRECT_COMPOSITION_REFS,
  PlatformRole,
  SEARCH_PATH,
  WAVE1_COMPONENT_TITLES,
  canExecuteScaffolder,
  componentNameFromRef,
  developerHubActionsForRole,
  documentationHref,
  platformComponentPath,
  documentationIndexPages,
  resolvePlatformRole,
  DOC_AUDIENCES,
  audienceLabel,
  documentationPagesForAudience,
  DOCUMENTATION_PERSONAS,
  documentationPageById,
} from '@internal/platform-common';
import { C, PHARMA_NAVY, PHARMA_NAVY_DARK, PHARMA_TEAL, PHARMA_TEAL_LIGHT } from '../theme/tokens';
import { BuildingBlocksVisual } from '../platform-components/BuildingBlocksVisual';
import { ArchitectureStackVisual } from './ArchitectureStackVisual';
import {
  NEXORA_CARD,
  NEXORA_CYAN_DARK,
  NEXORA_GREY,
} from '@internal/plugin-nexora-common';

const useStyles = makeStyles({
  hero: {
    background: `linear-gradient(180deg, ${PHARMA_NAVY_DARK} 0%, ${PHARMA_NAVY} 100%)`,
    borderRadius: 16,
    color: NEXORA_GREY[50],
    marginBottom: 24,
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
  heroTitle: {
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 'clamp(28px, 4vw, 40px)',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
    margin: 0,
  },
  heroCopy: {
    color: NEXORA_GREY[300],
    fontSize: 16,
    lineHeight: 1.7,
    marginTop: 12,
    maxWidth: 720,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
  },
  /** Primary CTA — solid teal (same vocabulary as theme secondary). */
  action: {
    background: PHARMA_TEAL,
    border: `1px solid ${PHARMA_TEAL}`,
    borderRadius: 10,
    color: `${NEXORA_CARD} !important`,
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 14px',
    textDecoration: 'none',
    textTransform: 'none',
    '&:hover': {
      background: NEXORA_CYAN_DARK,
      borderColor: NEXORA_CYAN_DARK,
      textDecoration: 'none',
    },
  },
  /** Secondary on dark hero — outline ghost. */
  ghostAction: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.28)',
    borderRadius: 10,
    color: `${NEXORA_GREY[50]} !important`,
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 14px',
    textDecoration: 'none',
    textTransform: 'none',
    '&:hover': {
      background: 'rgba(0,194,217,0.14)',
      borderColor: PHARMA_TEAL_LIGHT,
      textDecoration: 'none',
    },
  },
  /** Secondary on white cards — navy outline (never white-on-white). */
  outlineAction: {
    background: 'transparent',
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: `${PHARMA_NAVY} !important`,
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 14px',
    textDecoration: 'none',
    textTransform: 'none',
    '&:hover': {
      background: 'rgba(0,194,217,0.08)',
      borderColor: PHARMA_TEAL,
      textDecoration: 'none',
    },
  },
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    height: '100%',
    padding: 20,
  },
  featured: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 24,
  },
  title: {
    color: PHARMA_NAVY,
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: '0.04em',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  principle: {
    color: PHARMA_NAVY,
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: '0.01em',
    marginBottom: 8,
  },
  muted: {
    color: C.muted,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  step: {
    borderTop: `1px solid ${C.border}`,
    marginTop: 12,
    paddingTop: 12,
  },
  kinds: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  kind: {
    background: NEXORA_GREY[100],
    border: `1px solid ${C.border}`,
    borderRadius: 999,
    color: `${C.text} !important`,
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 12px',
    textDecoration: 'none',
    textTransform: 'none',
    '&:hover': {
      background: NEXORA_GREY[200],
      textDecoration: 'none',
    },
  },
  badge: {
    color: PHARMA_TEAL,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.12em',
    marginLeft: 8,
  },
  field: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.12em',
    marginTop: 8,
    textTransform: 'uppercase',
    color: PHARMA_TEAL,
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    margin: '12px 0',
  },
  chip: {
    background: 'transparent',
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: `${PHARMA_NAVY} !important`,
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 12px',
    textDecoration: 'none',
    textTransform: 'none',
    '&:hover, &:focus-visible': {
      background: 'rgba(0,194,217,0.08)',
      borderColor: PHARMA_TEAL,
      outline: 'none',
      textDecoration: 'none',
    },
  },
  builtWith: {
    marginTop: 12,
  },
});

export function DeveloperHubPage() {
  const classes = useStyles();
  const identityApi = useApi(identityApiRef);
  const [role, setRole] = useState<PlatformRole>('VIEWER');

  useEffect(() => {
    identityApi.getBackstageIdentity().then(identity => {
      setRole(resolvePlatformRole(identity.ownershipEntityRefs));
    });
  }, [identityApi]);

  const canCreate = canExecuteScaffolder(role);
  const actions = developerHubActionsForRole(role);
  const recent = documentationIndexPages();

  return (
    <Page themeId="documentation">
      <Content>
        <section className={classes.hero} aria-label="Developer Hub">
          <p className={classes.eyebrow}>Internal engineering</p>
          <h1 className={classes.heroTitle}>Developer Hub</h1>
          <p className={classes.heroCopy}>
            Keep core systems standard. Innovate through Data Products. This
            hub is the authenticated starting point for Nexora
            documentation. Pages are published with TechDocs and indexed by
            the existing Search plugin.
          </p>
          <div className={classes.actions}>
            {actions.map(action => (
              <Link
                key={action.id}
                className={action.developerOnly ? classes.action : classes.ghostAction}
                to={action.to}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </section>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <section className={classes.card} aria-label="How the platform fits together">
              <Typography className={classes.title}>Platform Architecture at a Glance</Typography>
              <Typography variant="body2" className={classes.muted} paragraph>
                Everything you build sits on Backstage, the open-source platform
                kernel. Nexora is the product and extension layer;
                Data Products are the independent services you ship on top.
              </Typography>
              <ArchitectureStackVisual />
              <Typography variant="body2" style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                <strong>The key insight:</strong> Systems of record (ERP, MES, LIMS, etc.) stay authoritative.
                Nexora is the control plane around them, not a second system of record.
              </Typography>
            </section>
          </Grid>

          <Grid item xs={12} md={8}>
            <section className={classes.card} aria-label="Search">
              <Typography className={classes.title}>Search</Typography>
              <Typography variant="body2" className={classes.muted}>
                Search uses the platform Search index (Catalog and TechDocs).
                Results are classified as Platform Documentation,
                Architecture, Golden Path, How-To, Data Product Documentation,
                or Contract Documentation. Backstage Search is the open-source
                engine behind this product feature.
              </Typography>
              <div className={classes.kinds}>
                <Link className={classes.kind} to={SEARCH_PATH}>
                  Search all documentation
                </Link>
                {DOC_SEARCH_KINDS.map(kind => (
                  <Link
                    key={kind}
                    className={classes.kind}
                    to={`${SEARCH_PATH}?query=${encodeURIComponent(kind)}`}
                  >
                    {kind}
                  </Link>
                ))}
              </div>
            </section>
          </Grid>
          <Grid item xs={12} md={4}>
            <section className={classes.card} aria-label="More documentation">
              <Typography className={classes.title}>More documentation</Typography>
              <Typography variant="body2" className={classes.muted} paragraph>
                Additional documentation pages beyond the sections above. Last
                reviewed {LAST_REVIEWED}. No separate database.
              </Typography>
              <div className={classes.list}>
                {recent.map(item => (
                  <Typography key={item.id} variant="body2">
                    <Link to={documentationHref(item.id)}>{item.title}</Link>
                  </Typography>
                ))}
              </div>
            </section>
          </Grid>

          <Grid item xs={12}>
            <section className={classes.card} aria-label="Architecture">
              <Typography className={classes.principle}>
                Keep Core Systems Standard. Innovate Through Data Products.
              </Typography>
              <Typography variant="body2" className={classes.muted} paragraph>
                Systems of record stay ERP, MES, LIMS, EWM, Historian, CMO and
                other IT/OT. Governed interfaces (API, MQTT, REST, events,
                files/streams) feed independently managed Data Products. Pharma
                Data Factory is the control plane, not a second system of record.
              </Typography>
              <div className={classes.actions}>
                <Link className={classes.action} to={ARCHITECTURE_STORY_PATH}>
                  Explore the Architecture
                </Link>
                <Link
                  className={classes.outlineAction}
                  to="/platform/architecture/developer"
                >
                  How developers build
                </Link>
                <Link
                  className={classes.outlineAction}
                  to={documentationHref('architecture-platform')}
                >
                  Platform Architecture docs
                </Link>
                <Link
                  className={classes.outlineAction}
                  to={documentationHref('aas-overview')}
                >
                  AAS Developer Docs
                </Link>
                <Link
                  className={classes.outlineAction}
                  to={documentationHref('uns-overview')}
                >
                  Unified Namespace Docs
                </Link>
                <Link
                  className={classes.outlineAction}
                  to="/marketplace"
                >
                  Marketplace
                </Link>
                <Link
                  className={classes.outlineAction}
                  to="/data-products"
                >
                  Data Products UI
                </Link>
              </div>
            </section>
          </Grid>

          <Grid item xs={12}>
            <section className={classes.card} aria-label="Platform Components">
              <Typography className={classes.title}>
                Build with Platform Components
              </Typography>
              <Typography className={classes.principle}>
                Build the domain logic. Reuse the platform.
              </Typography>
              <Typography variant="body2" className={classes.muted} paragraph>
                Discover governed technical building blocks for Data Products
                and Golden Paths. Platform Components run inside generated
                products. They are not Backstage plugins and not Data Products.
              </Typography>
              <ol className={classes.list} style={{ paddingLeft: 18 }}>
                <li>
                  <Link to="/platform-components">Browse Component Library</Link>
                </li>
                <li>
                  <Link to="/compose">Compose Data Product</Link>
                </li>
                <li>
                  <Link to={documentationHref('platform-component-composition')}>
                    Understand Composition
                  </Link>
                </li>
                <li>
                  <Link to={documentationHref('platform-component-product-model')}>
                    Implement Domain Logic
                  </Link>
                </li>
                <li>
                  <Link to={documentationHref('build-golden-paths')}>
                    Use Golden Path where one exists
                  </Link>
                </li>
              </ol>
              <BuildingBlocksVisual />
              <div className={classes.actions}>
                <Link className={classes.action} to="/platform-components">
                  Browse Platform Components
                </Link>
                {canCreate ? (
                  <Link className={classes.action} to="/compose">
                    Compose Data Product
                  </Link>
                ) : (
                  <Link
                    className={classes.outlineAction}
                    to={documentationHref('platform-component-composition')}
                  >
                    Composition documentation
                  </Link>
                )}
                <Link
                  className={classes.outlineAction}
                  to={documentationHref('platform-components')}
                >
                  What is a Platform Component?
                </Link>
                <Link
                  className={classes.outlineAction}
                  to={documentationHref('platform-component-using')}
                >
                  How to reuse a Component
                </Link>
                <Link
                  className={classes.outlineAction}
                  to={documentationHref('platform-component-decision')}
                >
                  Decision model
                </Link>
              </div>
            </section>
          </Grid>

          <Grid item xs={12}>
            <section className={classes.card} aria-label="Two development routes">
              <Typography className={classes.title}>Two development routes</Typography>
              <Typography variant="subtitle2">Route A — Existing Golden Path</Typography>
              <Typography variant="body2" className={classes.muted} paragraph>
                Marketplace → Golden Path → Create → generated Data Product.
                Official Create remains MQTT Temperature, REST Equipment, and
                OEE.
              </Typography>
              <Typography variant="subtitle2">Route B — New domain product</Typography>
              <Typography variant="body2" className={classes.muted} paragraph>
                Component Library → Composer → composition.yaml → domain
                implementation → tests → Catalog → TechDocs. Composer does not
                generate a runtime. Equipment Use Log is the design-first
                example of this route.
              </Typography>
              <div className={classes.actions}>
                {canCreate ? (
                  <Link className={classes.action} to="/create">
                    Route A · Create
                  </Link>
                ) : null}
                <Link className={classes.outlineAction} to="/compose">
                  Route B · Compose
                </Link>
                <Link
                  className={classes.outlineAction}
                  to={documentationHref('platform-component-equipment-use-log')}
                >
                  Equipment Use Log design
                </Link>
              </div>
            </section>
          </Grid>

          <Grid item xs={12}>
            <section className={classes.card} aria-label="Build on Nexora">
              <Typography className={classes.title}>Build on Nexora</Typography>
              <Typography className={classes.principle}>
                Adopt. Build. Partner.
              </Typography>
              <Typography variant="body2" className={classes.muted} paragraph>
                Three ways to extend the platform — through the curated
                Extension Catalog, the SDK and Golden Paths, or the partner
                program.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <div className={classes.featured}>
                    <Typography variant="subtitle1">Adopt</Typography>
                    <Typography variant="body2" className={classes.muted} paragraph>
                      Discover community Backstage plugins and governed Nexora
                      extensions in the curated catalog.
                    </Typography>
                    <Link className={classes.outlineAction} to="/plugin-directory">
                      Extension Catalog
                    </Link>
                  </div>
                </Grid>
                <Grid item xs={12} md={4}>
                  <div className={classes.featured}>
                    <Typography variant="subtitle1">Build</Typography>
                    <Typography variant="body2" className={classes.muted} paragraph>
                      Ship Data Products and integrations with the SDK, Golden
                      Paths, and Platform Components.
                    </Typography>
                    <div className={classes.actions}>
                      {canCreate ? (
                        <Link className={classes.action} to="/create">
                          Create
                        </Link>
                      ) : null}
                      <Link className={classes.outlineAction} to="/compose">
                        Compose
                      </Link>
                      <Link
                        className={classes.outlineAction}
                        to={documentationHref('build-golden-paths')}
                      >
                        Golden Paths
                      </Link>
                    </div>
                  </div>
                </Grid>
                <Grid item xs={12} md={4}>
                  <div className={classes.featured}>
                    <Typography variant="subtitle1">Partner</Typography>
                    <Typography variant="body2" className={classes.muted} paragraph>
                      Publish and certify extensions for Life Sciences
                      customers. Partner program is planned — not available
                      yet.
                    </Typography>
                  </div>
                </Grid>
              </Grid>
            </section>
          </Grid>

          <Grid item xs={12}>
            <section className={classes.card} aria-label="Certified Golden Paths">
              <Typography className={classes.title}>Golden Paths</Typography>
              <Grid container spacing={2}>
                {HUB_GOLDEN_PATHS.map(path => (
                  <Grid item xs={12} md={6} key={path.id}>
                    <div className={classes.featured}>
                      <Typography variant="subtitle1">
                        {path.name}
                        <span className={classes.badge}>{path.statusLabel}</span>
                      </Typography>
                      {path.id === 'oee-data-product' && (
                        <div className={classes.builtWith} aria-label="OEE Built With">
                          <Typography variant="body2">Built with</Typography>
                          <div className={classes.chips}>
                            {OEE_DIRECT_COMPOSITION_REFS.map(ref => {
                              const name = componentNameFromRef(ref);
                              return (
                                <Link
                                  key={name}
                                  className={classes.chip}
                                  to={platformComponentPath(name)}
                                >
                                  {WAVE1_COMPONENT_TITLES[name] || name}
                                </Link>
                              );
                            })}
                          </div>
                          <Typography variant="body2" className={classes.muted}>
                            {OEE_DIRECT_COMPOSITION_REFS.length} reusable
                            components · {OEE_DIRECT_COMPOSITION_REFS.length}{' '}
                            technically CERTIFIED
                          </Typography>
                          <Typography variant="body2" style={{ marginTop: 8 }}>
                            <Link to={documentationHref('oee-composition')}>
                              View Composition
                            </Link>
                          </Typography>
                        </div>
                      )}
                      <div className={classes.actions}>
                        <Link className={classes.outlineAction} to={documentationHref(path.docsId)}>
                          Golden Path docs
                        </Link>
                        {canCreate ? (
                          <Link className={classes.action} to={path.marketplacePath}>
                            Open in Marketplace
                          </Link>
                        ) : (
                          <Link className={classes.outlineAction} to={path.marketplacePath}>
                            View in Marketplace
                          </Link>
                        )}
                      </div>
                    </div>
                  </Grid>
                ))}
              </Grid>
            </section>
          </Grid>

          <Grid item xs={12}>
            <section
              className={classes.featured}
              aria-label="Build Your First Data Product"
            >
              <Typography className={classes.title}>
                Build Your First Data Product
              </Typography>
              <Typography variant="body2" paragraph>
                Seventeen steps from sign-in to TechDocs. MQTT Temperature is
                the reference Golden Path. Viewer can read this journey;
                creating a product requires Developer or above.
              </Typography>
              <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                {FIRST_DAY_STEPS.map((step, index) => (
                  <li key={step.id} className={classes.step}>
                    <Typography variant="subtitle2">
                      {String(index + 1).padStart(2, '0')}. {step.title}
                    </Typography>
                    <Typography variant="body2">
                      <span className={classes.field}>Why</span>
                      {step.why}
                    </Typography>
                    <Typography variant="body2">
                      <span className={classes.field}>Action</span>
                      {step.action}
                    </Typography>
                    <Typography variant="body2">
                      <span className={classes.field}>Expected result</span>
                      {step.expected}
                    </Typography>
                    <Typography variant="body2" className={classes.muted}>
                      <span className={classes.field}>Common error</span>
                      {step.commonError}
                    </Typography>
                    <Typography variant="body2">
                      <span className={classes.field}>Learn more</span>
                      <Link to={documentationHref(step.learnMoreId)}>
                        Documentation
                      </Link>
                      {step.platformRoute ? (
                        <>
                          {' · '}
                          <Link to={step.platformRoute}>Open in platform</Link>
                        </>
                      ) : null}
                    </Typography>
                  </li>
                ))}
              </ol>
            </section>
          </Grid>

          {DEVELOPER_HUB_SECTIONS.map(section => (
            <Grid item xs={12} md={6} key={section.id}>
              <section className={classes.card} aria-label={section.title}>
                <Typography className={classes.title}>{section.title}</Typography>
                <div className={classes.list}>
                  {section.pages.map(item => (
                    <Typography key={item.id} variant="body2">
                      <Link to={documentationHref(item.id)}>{item.title}</Link>
                    </Typography>
                  ))}
                </div>
              </section>
            </Grid>
          ))}
          <Grid item xs={12}>
            <section className={classes.card} aria-label="Documentation by role">
              <Typography className={classes.title}>Documentation by role</Typography>
              <Grid container spacing={2}>
                {DOCUMENTATION_PERSONAS.map(persona => (
                  <Grid item xs={12} md={4} key={persona.id}>
                    <Typography variant="subtitle1">{persona.title}</Typography>
                    <Typography variant="body2" className={classes.muted} paragraph>
                      {persona.description}
                    </Typography>
                    <div className={classes.list}>
                      {persona.pageIds.map(pageId => {
                        const page = documentationPageById(pageId);
                        return page ? (
                          <Typography key={pageId} variant="body2">
                            <Link to={documentationHref(pageId)}>{page.title}</Link>
                          </Typography>
                        ) : null;
                      })}
                    </div>
                  </Grid>
                ))}
              </Grid>
            </section>
          </Grid>
          <Grid item xs={12}>
            <section className={classes.card} aria-label="Documentation audiences">
              <Typography className={classes.title}>Documentation audiences</Typography>
              <Typography variant="body2" className={classes.muted} paragraph>
                Every page is classified for an audience. Customer-facing
                documentation is not yet published.
              </Typography>
              <div className={classes.list}>
                {DOC_AUDIENCES.map(audience => (
                  <Typography key={audience} variant="body2">
                    {audienceLabel(audience)} ·{' '}
                    {documentationPagesForAudience(audience).length} pages
                  </Typography>
                ))}
              </div>
            </section>
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
}
