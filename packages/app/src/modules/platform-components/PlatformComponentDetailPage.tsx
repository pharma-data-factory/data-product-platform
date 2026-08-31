import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Content,
  Header,
  InfoCard,
  Link,
  Page,
  Progress,
  StructuredMetadataTable,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Grid, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  LibraryPlatformComponent,
  PLATFORM_COMPONENT_CATEGORY_LABELS,
  PLATFORM_COMPONENT_REGISTRY_PATH,
  catalogGraphPathForRef,
  composerPath,
  compositionSnippetFor,
  documentationHref,
  formatJourneyError,
  isUnauthorizedError,
  toLibraryComponents,
  toRelatedPlatformComponents,
} from '@internal/platform-common';
import { C, PHARMA_NAVY, PHARMA_TEAL } from '../theme/tokens';

const useStyles = makeStyles({
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  action: {
    background: PHARMA_NAVY,
    borderRadius: 10,
    color: '#FFFFFF !important',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 14px',
    textDecoration: 'none',
    '&:hover': {
      filter: 'brightness(1.08)',
      textDecoration: 'none',
    },
  },
  ghost: {
    background: 'transparent',
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: `${PHARMA_NAVY} !important`,
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 14px',
    textDecoration: 'none',
  },
  planned: {
    color: C.muted,
    fontSize: 13,
    marginTop: 8,
  },
  banner: {
    background: '#F8FAFC',
    border: `1px solid ${C.border}`,
    borderLeft: `4px solid ${C.security}`,
    borderRadius: 10,
    color: C.text,
    fontSize: 14,
    marginBottom: 16,
    padding: '10px 14px',
  },
  bannerMuted: {
    background: '#F8FAFC',
    border: `1px dashed ${C.border}`,
    borderRadius: 10,
    color: C.muted,
    fontSize: 14,
    marginBottom: 16,
    padding: '10px 14px',
  },
  pre: {
    background: '#0A1929',
    borderRadius: 12,
    color: '#E2E8F0',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 13,
    lineHeight: 1.55,
    overflowX: 'auto',
    padding: 16,
    whiteSpace: 'pre-wrap',
  },
  list: {
    margin: '0 0 8px',
    paddingLeft: 18,
  },
  accent: {
    color: PHARMA_TEAL,
    fontWeight: 600,
  },
});

export function PlatformComponentDetailPage() {
  const classes = useStyles();
  const { name } = useParams();
  const catalogApi = useApi(catalogApiRef);
  const [component, setComponent] = useState<LibraryPlatformComponent>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    if (!name) {
      return undefined;
    }
    let active = true;
    catalogApi
      .getEntities({ filter: { kind: ['Component', 'API'] } })
      .then(response => {
        const match = toLibraryComponents(
          toRelatedPlatformComponents(response.items),
        ).find(item => item.name === name);
        if (!match) {
          throw new Error(`Platform Component ${name} was not found`);
        }
        if (!active) {
          return;
        }
        setComponent(match);
        setLoading(false);
      })
      .catch(err => {
        if (active) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [catalogApi, name]);

  const unauthorized = error ? isUnauthorizedError(error) : false;
  const docsHref = component
    ? component.documentation ||
      documentationHref(component.profile.documentationPageId)
    : documentationHref('platform-components');
  const sourceHref = component?.repository;

  return (
    <Page themeId="tool">
      <Header
        title={component?.title ?? 'Platform Component'}
        subtitle={component?.description}
        type="Platform Components"
        typeLink={PLATFORM_COMPONENT_REGISTRY_PATH}
      />
      <Content>
        {loading && <Progress />}
        {!loading && error && (
          <Typography variant="body2">
            {unauthorized ? 'Unauthorized' : formatJourneyError(error)}
          </Typography>
        )}
        {component && (
          <>
            {component.certificationStatus === 'PLANNED' && (
              <p className={classes.bannerMuted}>
                PLANNED — not ready to consume. This is a Catalog placeholder.
              </p>
            )}
            {component.certificationStatus === 'DEVELOPMENT' && (
              <p className={classes.banner}>
                DEVELOPMENT — not certified. Do not treat this as a Wave 1
                CERTIFIED runtime.
              </p>
            )}
            {component.runtimeAvailability === 'catalog-only' && (
              <p className={classes.bannerMuted}>
                Catalog only · No reusable runtime package. Version{' '}
                {component.version} is Catalog metadata, not a runtime proof.
              </p>
            )}
            <div className={classes.actions}>
              <Link className={classes.action} to={docsHref}>
                View Documentation
              </Link>
              {sourceHref ? (
                <Link className={classes.ghost} to={sourceHref}>
                  View Source
                </Link>
              ) : (
                <Typography variant="body2">
                  {component.profile.sourcePath
                    ? `Source path ${component.profile.sourcePath}`
                    : 'No reusable runtime source'}
                </Typography>
              )}
              <Link
                className={classes.ghost}
                to={catalogGraphPathForRef(component.entityRef)}
              >
                View Catalog Graph
              </Link>
              <Link
                className={classes.action}
                to={composerPath(component.name)}
              >
                Use in Composition
              </Link>
            </div>
            <Typography className={classes.planned} variant="body2">
              Composer 1.0 builds a GoldenPathComposition YAML. It is not a
              runtime orchestrator.
            </Typography>
            <Grid container spacing={3} style={{ marginTop: 8 }}>
              <Grid item xs={12} md={8}>
                <InfoCard title="Overview">
                  <Typography variant="body2" paragraph>
                    Building block. Not a Data Product. Technical platform
                    status only — not GxP or regulatory validation.
                  </Typography>
                  <StructuredMetadataTable
                    metadata={{
                      Name: component.title,
                      Category:
                        PLATFORM_COMPONENT_CATEGORY_LABELS[component.category],
                      Status: component.certificationStatus,
                      Version: component.version,
                      Runtime:
                        component.runtimeAvailability === 'runtime'
                          ? 'Runtime available'
                          : 'Catalog only · No runtime',
                      Owner: component.owner,
                      Lifecycle: component.lifecycle,
                    }}
                  />
                </InfoCard>
              </Grid>
              <Grid item xs={12} md={4}>
                <InfoCard title="Release / Version">
                  <StructuredMetadataTable
                    metadata={{
                      Version: component.version,
                      Certification: component.certificationStatus,
                      'Compatible Standard':
                        component.compatibleStandardVersions.join(', ') || '—',
                    }}
                  />
                  <Typography variant="body2" style={{ marginTop: 8 }}>
                    CERTIFIED means conformance to the Nexora
                    technical Platform Component standard. It does not mean GxP
                    validated.
                  </Typography>
                </InfoCard>
              </Grid>
              <Grid item xs={12}>
                <InfoCard title="Purpose">
                  <Typography variant="body2">{component.profile.purpose}</Typography>
                </InfoCard>
              </Grid>
              <Grid item xs={12} md={6}>
                <InfoCard title="Use when">
                  {component.profile.useWhen.length > 0 ? (
                    <ul className={classes.list}>
                      {component.profile.useWhen.map(item => (
                        <li key={item}>
                          <Typography variant="body2">{item}</Typography>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Typography variant="body2">
                      Not ready to consume. No reusable runtime package exists.
                    </Typography>
                  )}
                </InfoCard>
              </Grid>
              <Grid item xs={12} md={6}>
                <InfoCard title="Do not use when">
                  <ul className={classes.list}>
                    {component.profile.doNotUseWhen.map(item => (
                      <li key={item}>
                        <Typography variant="body2">{item}</Typography>
                      </li>
                    ))}
                  </ul>
                </InfoCard>
              </Grid>
              <Grid item xs={12} md={6}>
                <InfoCard title="Configuration">
                  {component.profile.configurationNote && (
                    <Typography variant="body2" paragraph>
                      {component.profile.configurationNote}
                    </Typography>
                  )}
                  {component.profile.configurationKeys.length > 0 ? (
                    <ul className={classes.list}>
                      {component.profile.configurationKeys.map(key => (
                        <li key={key}>
                          <Typography variant="body2">{key}</Typography>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Typography variant="body2">
                      No runtime configuration keys.
                    </Typography>
                  )}
                </InfoCard>
              </Grid>
              <Grid item xs={12} md={6}>
                <InfoCard title="Developer usage">
                  {component.profile.importExample ? (
                    <>
                      <pre className={classes.pre}>
                        {component.profile.importExample}
                      </pre>
                      {component.profile.importProvenance && (
                        <Typography variant="body2" style={{ marginTop: 8 }}>
                          Proven usage:{' '}
                          {component.profile.importProvenance}
                        </Typography>
                      )}
                    </>
                  ) : (
                    <Typography variant="body2">
                      No Python import exists. This component has no reusable
                      runtime package.
                    </Typography>
                  )}
                </InfoCard>
              </Grid>
              <Grid item xs={12} md={6}>
                <InfoCard title="Compatibility">
                  <Typography variant="body2">
                    Compatible Data Product Standard versions:{' '}
                    {component.compatibleStandardVersions.join(', ') ||
                      'unspecified'}
                  </Typography>
                  <Typography variant="body2" style={{ marginTop: 8 }}>
                    <Link to={documentationHref('platform-component-versioning')}>
                      Versioning & compatibility
                    </Link>
                  </Typography>
                </InfoCard>
              </Grid>
              <Grid item xs={12} md={6}>
                <InfoCard title="Dependencies">
                  <StructuredMetadataTable
                    metadata={{
                      'Depends On': component.dependsOn.join(', ') || 'None',
                      Provides: component.providesApis.join(', ') || 'None',
                      Consumes: component.consumesApis.join(', ') || 'None',
                    }}
                  />
                </InfoCard>
              </Grid>
              <Grid item xs={12}>
                <InfoCard title="Used by">
                  <Typography variant="body2">
                    <span className={classes.accent}>Used by</span>
                    {' — '}
                    {component.runtimeUsedBy.join(', ') || 'None'}
                  </Typography>
                  <Typography variant="body2" style={{ marginTop: 8 }}>
                    Planned / conceptual use —{' '}
                    {component.conceptualUsedBy.join(', ') || 'None'}
                  </Typography>
                  <Typography variant="body2" style={{ marginTop: 8 }}>
                    Design example —{' '}
                    {component.designUsedBy.join(', ') || 'None'}
                  </Typography>
                  <Typography variant="body2" style={{ marginTop: 8 }}>
                    Catalog relations — {component.usedBy.join(', ') || 'None'}
                  </Typography>
                  <Typography variant="body2" style={{ marginTop: 8 }}>
                    Runtime Used By is derived from validated compositions.
                    Conceptual Golden Paths and design examples are labelled
                    separately. Catalog relations remain visible and are not
                    stored as annotations. Equipment Use Log is a design
                    example until a runtime exists.
                  </Typography>
                </InfoCard>
              </Grid>
              <Grid item xs={12} md={6}>
                <InfoCard title="Documentation">
                  <Link to={docsHref}>Open documentation</Link>
                </InfoCard>
              </Grid>
              <Grid item xs={12} md={6}>
                <InfoCard title="Source">
                  {component.profile.sourcePath ? (
                    <Typography variant="body2">
                      {component.profile.sourcePath}
                    </Typography>
                  ) : (
                    <Typography variant="body2">
                      No reusable runtime package in this repository.
                    </Typography>
                  )}
                  {component.repository && (
                    <Typography variant="body2" style={{ marginTop: 8 }}>
                      <Link to={component.repository}>Open repository</Link>
                    </Typography>
                  )}
                </InfoCard>
              </Grid>
              <Grid item xs={12}>
                <InfoCard title="Use in composition">
                  <Typography variant="body2" paragraph>
                    Open Composer to generate a GoldenPathComposition YAML.
                    Generic runtime generation is not available.
                  </Typography>
                  <pre className={classes.pre}>
                    {compositionSnippetFor(component.name)}
                  </pre>
                  <Typography variant="body2" style={{ marginTop: 12 }}>
                    <Link to={composerPath(component.name)}>
                      Use in Composition
                    </Link>
                    {' · '}
                    <Link to={documentationHref('platform-component-composition')}>
                      Composition documentation
                    </Link>
                    {' · '}
                    <Link to={documentationHref('platform-component-composer')}>
                      Composer
                    </Link>
                  </Typography>
                </InfoCard>
              </Grid>
            </Grid>
          </>
        )}
      </Content>
    </Page>
  );
}
