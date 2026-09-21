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
import { Grid, Typography, Box } from '@material-ui/core';
import {
  CertificationChip,
  JourneyState,
  QualityChip,
  usePlatformRole,
} from '@internal/plugin-data-products';
import {
  BuiltWithSummary,
  canCreateDataProduct,
  currentRelease,
  distributionStatusLines,
  formatJourneyError,
  goldenPathDocumentationHref,
  isOfficialGoldenPath,
  isUnauthorizedError,
  builtWithSummary,
  releasesForTemplate,
  toRelatedPlatformComponents,
} from '@internal/platform-common';
import { marketplaceCatalogSources } from '../catalog';
import { OeeBuiltWith } from './OeeBuiltWith';
import { useGoldenPathCompositions } from '../useGoldenPathCompositions';
import { artifactRegistryApiRef } from '../artifactRegistryApi';
import { entitlementApiRef } from '../entitlementApi';
import { loadOfferings } from '../offeringSource';
import {
  MarketplaceItem,
  enrichMarketplaceItem,
  goldenPathCreateHighlights,
  marketplaceCreateAllowed,
  marketplaceOfferingKind,
} from '../data';

export function MarketplaceDetailPage() {
  const { id } = useParams();
  const catalogApi = useApi(catalogApiRef);
  const entitlementApi = useApi(entitlementApiRef);
  const registryApi = useApi(artifactRegistryApiRef);
  const { role } = usePlatformRole();
  const canCreate = canCreateDataProduct(role);
  const [item, setItem] = useState<MarketplaceItem | undefined>(undefined);
  const createAllowed = item
    ? marketplaceCreateAllowed(
        item,
        role,
        item.commercialStatus === 'ENTITLED' ||
          item.commercialStatus === undefined,
      )
    : false;
  const release =
    item && isOfficialGoldenPath(item.id) ? currentRelease(item.id) : undefined;
  const history =
    item && isOfficialGoldenPath(item.id) ? releasesForTemplate(item.id) : [];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [builtWith, setBuiltWith] = useState<BuiltWithSummary>();
  const { compositions, loading: compositionsLoading } =
    useGoldenPathCompositions();

  useEffect(() => {
    if (compositionsLoading) {
      return undefined;
    }
    let active = true;
    Promise.all([
      catalogApi.getEntities({
        filter: { kind: ['Component', 'API', 'Template'] },
      }),
      entitlementApi.getProducts().catch(() => undefined),
      loadOfferings(registryApi),
    ])
      .then(([response, productsSnapshot, offerings]) => {
        if (!active) {
          return;
        }
        // Resolved from the same source the list page uses, so a coordinate
        // that is only in the registry still has a detail page — and one that
        // has been removed from it no longer does.
        const base = offerings.find(entry => entry.id === id);
        if (!base) {
          setItem(undefined);
          setLoading(false);
          return;
        }
        const { products, apis, templates } = marketplaceCatalogSources(
          response.items,
        );
        // The panel is driven by the composition the manifest names, not by
        // the UI recognising a product id. An offering with no `builtFrom`
        // simply has no panel. See NXD-029.
        const composition = base.builtFrom
          ? compositions.byName.get(base.builtFrom)
          : undefined;
        setBuiltWith(
          composition
            ? builtWithSummary(
                toRelatedPlatformComponents(response.items),
                composition.spec.components
                  .filter(entry => !entry.optional)
                  .map(entry => entry.ref),
                composition.metadata.title ?? composition.metadata.name,
              )
            : undefined,
        );
        const entitledIds = productsSnapshot?.products
          .filter(product => product.entitled)
          .map(product => product.productId);
        const enriched = enrichMarketplaceItem(
          base,
          products,
          apis,
          templates,
          entitledIds,
        );
        const commercial = productsSnapshot?.products.find(
          product =>
            product.templateId === enriched.id ||
            product.marketplaceId === enriched.id,
        );
        setItem(
          commercial?.accessState === 'PENDING_ACCESS'
            ? {
                ...enriched,
                commercialStatus: 'PENDING_ACCESS',
                commercialCopy:
                  'Marketplace registration is pending organization linking',
              }
            : enriched,
        );
        setLoading(false);
      })
      .catch(err => {
        if (active) {
          setItem(undefined);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [catalogApi, entitlementApi, registryApi, id, compositions, compositionsLoading]);

  return (
    <Page themeId="tool">
      <Header
        title={item?.name ?? 'Marketplace item'}
        subtitle={item?.description}
        type="Marketplace"
        typeLink="/marketplace"
      />
      <Content>
        {loading && <Progress />}
        {!loading && !item && (
          <JourneyState
            title="Empty"
            message="No marketplace entry matches this identifier."
          />
        )}
        {error && (
          <JourneyState
            title={
              isUnauthorizedError(error)
                ? 'Unauthorized'
                : 'Catalog unavailable'
            }
            message={formatJourneyError(error)}
          />
        )}
        {item && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <InfoCard title="Entry">
                <StructuredMetadataTable
                  metadata={{
                    Name: item.name,
                    Offering: marketplaceOfferingKind(item) || item.category,
                    Category: item.category,
                    Version: item.version,
                    'Release status':
                      item.releaseStatus ||
                      'Not an official Golden Path release',
                    Certification: item.certificationStatus,
                    // What this path was built to satisfy. A consumer reads it
                    // before installing, which is the point: the requirements
                    // travel with the template, so this answers "what is it
                    // held to?" without access to the URS Composer it came
                    // from. Not a validation or GxP claim.
                    Requirements: item.ursSatisfies
                      ? `Satisfies ${item.ursSatisfies}${
                          item.ursRequirementCount
                            ? ` · ${item.ursRequirementCount} requirements`
                            : ''
                        }`
                      : 'No requirement set declared',
                    Owner: 'Assigned during create',
                    Domain:
                      item.id.includes('temperature') ||
                      item.id.includes('equipment')
                        ? 'manufacturing'
                        : 'unassigned',
                    'GitHub Repository': 'Created in pharma-data-factory',
                    Contract: item.contractName || 'Not registered',
                    'Contract version':
                      item.contractVersion || 'Not registered',
                    Provider: item.provider,
                    Status: item.status,
                    Commercial: item.commercialStatus || 'Not a commercial SKU',
                    Availability: item.commercialCopy || '—',
                  }}
                />
              </InfoCard>
              {builtWith && (
                <InfoCard title="Built with">
                  <OeeBuiltWith summary={builtWith} />
                </InfoCard>
              )}
              {release && (
                <InfoCard title="Current release">
                  <StructuredMetadataTable
                    metadata={{
                      Version: release.version,
                      'Release status': release.status,
                      Certification: release.certification.status,
                      Standard: release.certification.standard,
                      SDK: release.certification.sdk,
                      Released: release.release.date,
                    }}
                  />
                  <Typography variant="body2" style={{ marginTop: 12 }}>
                    CERTIFIED is technical conformance. RELEASED is approval for
                    consumption. Neither is GxP validation.
                  </Typography>
                </InfoCard>
              )}
              {release && (
                <InfoCard title="Distribution">
                  {distributionStatusLines(release.distribution).map(row => (
                    <Box key={row.channel} marginBottom={1}>
                      <Typography variant="body2">
                        {row.label} — {row.availability}
                      </Typography>
                      {row.description ? (
                        <Typography variant="body2" color="textSecondary">
                          {row.description}
                        </Typography>
                      ) : null}
                    </Box>
                  ))}
                  <Typography variant="body2" style={{ marginTop: 12 }}>
                    Marketplace Create uses Internal and Template Edition only.
                    Platform Edition is PLANNED. SaaS is FUTURE. Distribution is
                    not entitlement.
                  </Typography>
                </InfoCard>
              )}
              {history.length > 0 && (
                <InfoCard title="Release history">
                  {history.map(entry => (
                    <Typography key={entry.version} variant="body2">
                      {entry.version}
                      {entry.version === release?.version ? ' CURRENT' : ''}
                      {`  ${entry.status}`}
                    </Typography>
                  ))}
                </InfoCard>
              )}
              {release && (
                <InfoCard title="Changelog">
                  <Typography variant="subtitle2">Breaking changes</Typography>
                  <Typography variant="body2">
                    {release.changelog.breaking.join('; ') || 'None'}
                  </Typography>
                  <Typography variant="subtitle2">New capabilities</Typography>
                  <Typography variant="body2">
                    {release.changelog.capabilities.join('; ') || 'None'}
                  </Typography>
                  <Typography variant="subtitle2">Fixes</Typography>
                  <Typography variant="body2">
                    {release.changelog.fixes.join('; ') || 'None'}
                  </Typography>
                  <Typography variant="subtitle2">Migration notes</Typography>
                  <Typography variant="body2">
                    {release.changelog.migration}
                  </Typography>
                  <Typography variant="body2" style={{ marginTop: 12 }}>
                    <Link to={`/releases/${item.id}`}>
                      Open Release Catalog
                    </Link>
                  </Typography>
                </InfoCard>
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              <InfoCard title="Status">
                {item.qualityStatus && (
                  <>
                    <Typography variant="subtitle2">Quality</Typography>
                    <QualityChip status={item.qualityStatus} />
                  </>
                )}
                <Typography variant="subtitle2" style={{ marginTop: 12 }}>
                  Certification
                </Typography>
                <CertificationChip status={item.certificationStatus} />
                {goldenPathCreateHighlights(item).length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <Typography variant="subtitle2">
                      Before you create
                    </Typography>
                    {goldenPathCreateHighlights(item).map(label => (
                      <Typography key={label} variant="body2">
                        {label}
                      </Typography>
                    ))}
                  </div>
                )}
                <Typography variant="body2" style={{ marginTop: 12 }}>
                  Technical platform certification only. This is not GxP or
                  regulatory validation.
                </Typography>
                {item.contractName && (
                  <Typography variant="body2" style={{ marginTop: 12 }}>
                    <Link to={`/catalog/default/api/${item.contractName}`}>
                      View Data Contract
                    </Link>
                  </Typography>
                )}
                <Typography variant="body2" style={{ marginTop: 12 }}>
                  <Link to={goldenPathDocumentationHref(item.id)}>
                    Golden Path documentation
                  </Link>
                </Typography>
                {item.templateReference && createAllowed && (
                  <Typography variant="body2" style={{ marginTop: 12 }}>
                    <Link to={item.documentation}>Create Data Product</Link>
                  </Typography>
                )}
                {item.templateReference &&
                  canCreate &&
                  !createAllowed &&
                  item.commercialStatus === 'PENDING_ACCESS' && (
                    <JourneyState
                      title="Pending access"
                      message="Marketplace identity is verified. Platform Admin must approve the organization link before Create is available."
                    />
                  )}
                {item.templateReference &&
                  canCreate &&
                  !createAllowed &&
                  item.commercialStatus === 'NOT_ENTITLED' && (
                    <JourneyState
                      title="Commercial capability unavailable"
                      message="Your role may create Data Products, but this organization is not entitled to this commercial Golden Path."
                    />
                  )}
                {item.templateReference &&
                  canCreate &&
                  !createAllowed &&
                  item.commercialStatus !== 'NOT_ENTITLED' && (
                    <JourneyState
                      title="Not released"
                      message="Create uses an approved RELEASED Golden Path version. Platform Admin can access non-released templates for internal development. Retired releases are not offered for new creation."
                    />
                  )}
                {item.templateReference && !canCreate && (
                  <JourneyState
                    title="Unauthorized"
                    message="Your role can browse this Golden Path but cannot create Data Products."
                  />
                )}
              </InfoCard>
            </Grid>
          </Grid>
        )}
      </Content>
    </Page>
  );
}
