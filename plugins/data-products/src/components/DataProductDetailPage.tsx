import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
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
import { nexoraDataQualityApiRef } from '@internal/plugin-nexora-common';
import { Box, Button, Tab, Tabs, Typography } from '@material-ui/core';
import {
  documentationHref,
  formatJourneyError,
  isUnauthorizedError,
} from '@internal/platform-common';
import {
  DataProductJsonViewer,
  DataProductMetricCards,
  DataProductRealtimeFeed,
  DataProductSchemaViewer,
  DataProductTable,
  DataProductTimeseries,
  getDataProductExtension,
  useDataProduct,
  useDataProductQuery,
  useDataProductStream,
  type ConsumeContext,
  type PresentationCapability,
} from '@internal/data-product-consumption';
import { DataProduct, catalogClassLabel, toRelatedDataProducts } from '../model';
import { CertificationChip } from './CertificationChip';
import { CompatibilityChip } from './CompatibilityChip';
import { CiQualityGateCard } from './CiQualityGateCard';
import { DependencyCard } from './DependencyCard';
import { DiscoverCard } from './DiscoverCard';
import { JourneyState } from './JourneyState';
import { PlatformComplianceCard } from './PlatformComplianceCard';
import { QualityAndContractCard } from './QualityAndContractCard';
import { UpgradeChip } from './UpgradeChip';

function parseContext(search: string): ConsumeContext {
  const q = new URLSearchParams(search);
  return {
    site: q.get('site') ?? undefined,
    area: q.get('area') ?? undefined,
    line: q.get('line') ?? undefined,
    equipment: q.get('equipment') ?? undefined,
  };
}

function hasCap(
  caps: PresentationCapability[] | undefined,
  cap: PresentationCapability,
) {
  return Boolean(caps?.includes(cap));
}

/**
 * Metadata-driven Data Product experience (Consumption Framework v1).
 * Preserves governance cards on Overview / Tests while adding consume tabs.
 */
export function DataProductDetailPage() {
  const { name } = useParams();
  const location = useLocation();
  const context = useMemo(() => parseContext(location.search), [location.search]);
  const catalogApi = useApi(catalogApiRef);
  const [product, setProduct] = useState<DataProduct>();
  const [catalogError, setCatalogError] = useState<Error>();
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  const entityRef = name ? `component:default/${name}` : undefined;
  const {
    data: descriptor,
    error: consumeError,
    loading: consumeLoading,
  } = useDataProduct(entityRef);

  const query = useDataProductQuery({
    productRef: entityRef,
    context,
    enabled: Boolean(entityRef),
  });

  const stream = useDataProductStream({
    productRef: entityRef,
    context,
    enabled: Boolean(
      descriptor?.interfaces.some(i => i.type === 'stream') ||
        hasCap(descriptor?.presentation.capabilities, 'realtime'),
    ),
  });

  useEffect(() => {
    let active = true;
    if (!name) {
      return () => {
        active = false;
      };
    }
    setCatalogLoading(true);
    catalogApi
      .getEntities({ filter: { kind: ['Component', 'API'] } })
      .then(response => {
        const products = toRelatedDataProducts(response.items);
        const match = products.find(item => item.name === name);
        if (!match) {
          throw new Error(`Data Product ${name} was not found`);
        }
        if (!active) return;
        setProduct(match);
        rememberRecent(match.name);
        setCatalogLoading(false);
      })
      .catch(err => {
        if (active) {
          setCatalogError(err instanceof Error ? err : new Error(String(err)));
          setCatalogLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [catalogApi, name]);

  const loading = catalogLoading || consumeLoading;
  const error = catalogError;
  const unauthorized = error ? isUnauthorizedError(error) : false;
  const title = descriptor?.title ?? product?.title ?? 'Data Product';
  const caps = descriptor?.presentation.capabilities ?? [];
  const showRealtime =
    descriptor?.interfaces.some(i => i.type === 'stream') || hasCap(caps, 'realtime');
  const showApi = descriptor?.interfaces.some(i => i.type === 'rest' || i.type === 'openapi');
  const extensions = descriptor?.presentation.extensions ?? [];

  const timeseriesPoints = (query.data?.rows ?? [])
    .filter(r => typeof r.timestamp === 'string' && typeof r.temperature === 'number')
    .map(r => ({
      timestamp: String(r.timestamp),
      value: Number(r.temperature),
      label: String(r.deviceId ?? ''),
    }));

  const metricCards =
    query.data?.rows?.[0] && hasCap(caps, 'metric-cards')
      ? Object.entries(query.data.rows[0])
          .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
          .slice(0, 8)
          .map(([label, value]) => ({
            label,
            value:
              typeof value === 'number' && value >= 0 && value <= 1
                ? `${(value * 100).toFixed(1)}%`
                : String(value),
          }))
      : [];

  return (
    <Page themeId="tool">
      <Header
        title={title}
        subtitle={descriptor?.description ?? product?.description}
        type="Data Products"
        typeLink="/data-products"
      />
      <Content>
        {loading && <Progress />}
        {!loading && error && (
          <JourneyState
            title={unauthorized ? 'Unauthorized' : 'Unable to load Data Product'}
            message={formatJourneyError(error)}
          />
        )}
        {!loading && !error && !product && (
          <JourneyState
            title="Empty"
            message="This Data Product is not in the catalog yet."
          />
        )}
        {product && (
          <>
            {(context.site || context.line || context.equipment) && (
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
                Context: {[
                  context.site && `site=${context.site}`,
                  context.line && `line=${context.line}`,
                  context.equipment && `equipment=${context.equipment}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Typography>
            )}
            {consumeError && (
              <Typography color="error" variant="body2" style={{ marginBottom: 8 }}>
                Consumption: {consumeError.code} — {consumeError.message}
              </Typography>
            )}
            <Tabs
              value={tab}
              onChange={(_, value) => setTab(value)}
              indicatorColor="primary"
              textColor="primary"
              variant="scrollable"
              style={{ marginBottom: 16 }}
            >
              <Tab value="overview" label="Overview" />
              <Tab value="data" label="Data" />
              {showApi && <Tab value="api" label="API" />}
              {showRealtime && <Tab value="realtime" label="Realtime" />}
              <Tab value="contracts" label="Contracts" />
              <Tab value="quality" label="Quality" />
              <Tab value="lineage" label="Lineage" />
              <Tab value="tests" label="Tests" />
              <Tab value="validation" label="Validation" />
              <Tab value="ownership" label="Ownership" />
            </Tabs>

            {tab === 'overview' && (
              <OverviewTab
                product={product}
                descriptor={descriptor}
                extensions={extensions}
                queryResult={query.data}
                context={context}
              />
            )}

            {tab === 'data' && (
              <Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void query.refresh()}
                  style={{ marginBottom: 12 }}
                >
                  Refresh
                </Button>
                {query.loading && <Progress />}
                {query.error && (
                  <Typography color="error">
                    {query.error.code}: {query.error.message}
                  </Typography>
                )}
                {hasCap(caps, 'metric-cards') && metricCards.length > 0 && (
                  <Box mb={2}>
                    <DataProductMetricCards metrics={metricCards} />
                  </Box>
                )}
                {hasCap(caps, 'timeseries') && (
                  <Box mb={2}>
                    <DataProductTimeseries points={timeseriesPoints} />
                  </Box>
                )}
                <DataProductTable result={query.data} />
                {hasCap(caps, 'json') && query.data && (
                  <Box mt={2}>
                    <DataProductJsonViewer value={query.data.rows} title="Raw rows" />
                  </Box>
                )}
              </Box>
            )}

            {tab === 'api' && showApi && (
              <InfoCard title="Interfaces">
                <StructuredMetadataTable
                  metadata={Object.fromEntries(
                    (descriptor?.interfaces ?? []).map(i => [
                      i.id,
                      `${i.type}${i.path ? ` ${i.path}` : ''}${
                        i.protocol ? ` (${i.protocol})` : ''
                      }${i.topic ? ` topic=${i.topic}` : ''}`,
                    ]),
                  )}
                />
                <Typography variant="body2" style={{ marginTop: 12 }}>
                  Endpoint resolution goes through the Consumption backend — do not hardcode
                  product URLs in plugins. Live OpenAPI explorer is limited to declared
                  contracts; credentials are never exposed.
                </Typography>
                {descriptor?.interfaces.find(i => i.openApiPath) && (
                  <Typography variant="body2" style={{ marginTop: 8 }}>
                    OpenAPI path annotation:{' '}
                    {descriptor.interfaces.find(i => i.openApiPath)?.openApiPath}
                  </Typography>
                )}
              </InfoCard>
            )}

            {tab === 'realtime' && showRealtime && (
              <>
                <DataProductRealtimeFeed
                  events={stream.events}
                  status={stream.status}
                  eventCount={stream.eventCount}
                  onPause={stream.pause}
                  onResume={stream.resume}
                />
                <Typography
                  variant="caption"
                  color="textSecondary"
                  display="block"
                  style={{ marginTop: 8 }}
                >
                  Browser uses SSE/poll via Backstage — MQTT credentials stay server-side.
                </Typography>
              </>
            )}

            {tab === 'contracts' && (
              <Box>
                <Typography variant="subtitle2">Input Contracts</Typography>
                {(descriptor?.contracts.inputs ?? []).length === 0 ? (
                  <Typography color="textSecondary">None declared</Typography>
                ) : (
                  (descriptor?.contracts.inputs ?? []).map(c => (
                    <DataProductSchemaViewer key={c} name={c} fields={[]} />
                  ))
                )}
                <Typography variant="subtitle2" style={{ marginTop: 16 }}>
                  Output Contracts
                </Typography>
                {(descriptor?.contracts.outputs ?? []).map(c => (
                  <DataProductSchemaViewer key={c} name={c} fields={[]} />
                ))}
                <Box mt={2} id="contract">
                  <InfoCard title="Contract">
                    <CompatibilityChip status={product.compatibilityStatus} />
                    <div style={{ marginTop: 16 }}>
                      <StructuredMetadataTable
                        metadata={{
                          Contract:
                            product.contractTitle ||
                            product.contractLogicalName ||
                            product.dataContract ||
                            'Not registered',
                          Version: product.dataContractVersion || 'Not registered',
                          Compatibility: product.compatibilityStatus,
                        }}
                      />
                    </div>
                    <Typography variant="body2" style={{ marginTop: 12 }}>
                      <Link to={documentationHref('contracts')}>Contract documentation</Link>
                    </Typography>
                  </InfoCard>
                </Box>
              </Box>
            )}

            {tab === 'quality' && (
              <QualityTab
                product={product}
                descriptor={descriptor}
                entityRef={entityRef}
              />
            )}

            {tab === 'lineage' && (
              <Box>
                <InfoCard title="Lineage">
                  {(descriptor?.lineage ?? []).length === 0 ? (
                    <Typography color="textSecondary">No lineage relations declared.</Typography>
                  ) : (
                    <ul>
                      {(descriptor?.lineage ?? []).map((e, i) => (
                        <li key={`${e.from}-${e.to}-${i}`}>
                          <code>{e.from}</code> —[{e.relation}]→ <code>{e.to}</code>
                        </li>
                      ))}
                    </ul>
                  )}
                </InfoCard>
                <div id="dependencies">
                  <DependencyCard product={product} />
                </div>
              </Box>
            )}

            {tab === 'tests' && (
              <Box>
                <div id="health">
                  <Typography variant="h6" style={{ marginBottom: 8 }}>
                    Health
                  </Typography>
                </div>
                <div id="ci-quality-gate">
                  <CiQualityGateCard entityRef={product.entityRef} />
                </div>
                <div id="platform-compliance">
                  <PlatformComplianceCard product={product} />
                </div>
                <Typography variant="body2" color="textSecondary" style={{ marginTop: 12 }}>
                  Passing tests do not imply product validation status VALIDATED.
                </Typography>
              </Box>
            )}

            {tab === 'validation' && (
              <InfoCard title="Validation">
                <StructuredMetadataTable
                  metadata={{
                    'Validation Status': descriptor?.validation.status ?? 'NOT_VALIDATED',
                    Baseline: descriptor?.validation.baseline ?? 'NOT_AVAILABLE',
                    URS: descriptor?.validation.urs ?? 'NOT_AVAILABLE',
                    'System Spec': descriptor?.validation.systemSpec ?? 'NOT_AVAILABLE',
                    Traceability: descriptor?.validation.traceability ?? 'NOT_AVAILABLE',
                    'Last Validation Run':
                      descriptor?.validation.lastValidationRun ?? 'NOT_AVAILABLE',
                  }}
                />
                <Typography variant="body2" style={{ marginTop: 12 }}>
                  Status is never auto-promoted by the Consumption Framework.
                </Typography>
              </InfoCard>
            )}

            {tab === 'ownership' && (
              <Box>
                <InfoCard title="Ownership">
                  <StructuredMetadataTable
                    metadata={{
                      Owner: descriptor?.owner ?? product.owner,
                      Domain: descriptor?.domain ?? product.domain,
                      Lifecycle: descriptor?.lifecycle ?? product.lifecycle,
                      Repository: descriptor?.repository ?? 'NOT_AVAILABLE',
                      Documentation: descriptor?.documentation ?? 'NOT_AVAILABLE',
                    }}
                  />
                  {descriptor?.repository && (
                    <Typography variant="body2" style={{ marginTop: 8 }}>
                      <Link to={descriptor.repository}>Source repository</Link>
                    </Typography>
                  )}
                </InfoCard>
                <div id="discover">
                  <DiscoverCard product={product} />
                </div>
              </Box>
            )}
          </>
        )}
      </Content>
    </Page>
  );
}

/**
 * Quality tab — shows both annotation-based quality metadata and live health
 * checks from the Nexora Data Quality provider.
 *
 * Runtime Health vs. Data Health (Phase 6, P6-S6):
 * - Annotation metadata = declared targets + status set by the product owner
 * - Live health checks = measured at runtime by the product itself
 *
 * Live checks are best-effort: if the provider is unavailable the section is
 * hidden rather than showing a misleading empty state.
 */
function QualityTab({
  product,
  descriptor,
  entityRef,
}: {
  product: DataProduct;
  descriptor: ReturnType<typeof useDataProduct>['data'];
  entityRef?: string;
}) {
  const qualityApi = useApi(nexoraDataQualityApiRef);
  const [liveHealth, setLiveHealth] = useState<Record<string, string>>({});
  const [liveLoading, setLiveLoading] = useState(false);

  useEffect(() => {
    if (!entityRef) return;
    let active = true;
    setLiveLoading(true);
    qualityApi
      .getQuality(entityRef)
      .then(result => {
        if (!active || !result.value) return;
        const health = result.value;
        const checks: Record<string, string> = {};
        for (const [key, check] of Object.entries(health)) {
          if (check && typeof check === 'object' && 'state' in check) {
            checks[key] = `${(check as { state: string }).state}${(check as { message?: string }).message ? ` — ${(check as { message: string }).message}` : ''}`;
          }
        }
        setLiveHealth(checks);
        setLiveLoading(false);
      })
      .catch(() => {
        if (active) setLiveLoading(false);
      });
    return () => { active = false; };
  }, [qualityApi, entityRef]);

  return (
    <Box>
      <InfoCard title="Declared Quality">
        <StructuredMetadataTable
          metadata={{
            'Freshness target (s)':
              descriptor?.quality.freshnessTargetSeconds ?? 'NOT_AVAILABLE',
            'Completeness target':
              descriptor?.quality.completenessTarget ?? 'NOT_AVAILABLE',
            'Live freshness': descriptor?.quality.freshnessSeconds ?? 'NOT_AVAILABLE',
            'Live completeness': descriptor?.quality.completeness ?? 'NOT_AVAILABLE',
            'Last update': descriptor?.quality.lastUpdate ?? 'NOT_AVAILABLE',
            Status: descriptor?.quality.status ?? 'NOT_AVAILABLE',
            Checks: (descriptor?.quality.checks ?? []).join(', ') || 'NOT_AVAILABLE',
          }}
        />
        <Typography variant="body2" style={{ marginTop: 12 }}>
          Declared quality targets. Values show NOT_AVAILABLE until measured by the product.
        </Typography>
      </InfoCard>

      {(liveLoading || Object.keys(liveHealth).length > 0) && (
        <Box mt={2}>
          <InfoCard title="Live Health Checks">
            {liveLoading ? (
              <Progress />
            ) : (
              <>
                <StructuredMetadataTable metadata={liveHealth} />
                <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
                  Runtime health checks measured by the deployed product.
                  HEALTHY/WARNING/ERROR/UNKNOWN — not GxP validation.
                </Typography>
              </>
            )}
          </InfoCard>
        </Box>
      )}

      <Box mt={2}>
        <QualityAndContractCard product={product} />
      </Box>
    </Box>
  );
}

function OverviewTab({
  product,
  descriptor,
  extensions,
  queryResult,
  context,
}: {
  product: DataProduct;
  descriptor: ReturnType<typeof useDataProduct>['data'];
  extensions: string[];
  queryResult: ReturnType<typeof useDataProductQuery>['data'];
  context: ConsumeContext;
}) {
  return (
    <Box>
      <InfoCard title="Overview">
        {catalogClassLabel(product) && (
          <Typography variant="body2" style={{ marginBottom: 12 }}>
            {catalogClassLabel(product)} catalog entity. It is not an operational Data Product
            generated from a Golden Path.
          </Typography>
        )}
        <StructuredMetadataTable
          metadata={{
            Name: descriptor?.title ?? product.title,
            Owner: descriptor?.owner ?? product.owner,
            Domain: descriptor?.domain ?? product.domain,
            Lifecycle: descriptor?.lifecycle ?? product.lifecycle,
            Version: descriptor?.version ?? product.version ?? '—',
            Validation: descriptor?.validation.status ?? 'NOT_VALIDATED',
            Certification: product.certificationStatus,
            Capabilities: (descriptor?.presentation.capabilities ?? []).join(', ') || '—',
          }}
        />
        <Typography variant="subtitle2" style={{ marginTop: 16 }}>
          Interfaces
        </Typography>
        <StructuredMetadataTable
          metadata={Object.fromEntries(
            (descriptor?.interfaces ?? [{ id: 'query', type: 'rest' as const }]).map(i => [
              i.id,
              i.type === 'mqtt' ? 'UNS / MQTT (source)' : `${i.type} Available`,
            ]),
          )}
        />
        <Typography variant="body2" style={{ marginTop: 12 }}>
          Technical platform status only. This is not GxP or regulatory validation.
        </Typography>
      </InfoCard>

      <Box mt={2}>
        <InfoCard title="Certification">
          <CertificationChip status={product.certificationStatus} />
          {catalogClassLabel(product) && (
            <Typography variant="body2" style={{ marginTop: 12 }}>
              {catalogClassLabel(product)}
            </Typography>
          )}
        </InfoCard>
      </Box>

      {extensions.map(id => {
        const ext = getDataProductExtension(id);
        if (!ext) return null;
        const Comp = ext.Component;
        return (
          <Box mt={2} key={id}>
            <InfoCard title={ext.title}>
              <Comp
                productName={product.name}
                queryResult={queryResult}
                context={context}
              />
            </InfoCard>
          </Box>
        );
      })}

      {product.upgrade && (
        <Box mt={2}>
          <InfoCard title="Upgrade Status">
            <UpgradeChip status={product.upgrade.overall} />
            <Typography variant="body2" style={{ marginTop: 12 }}>
              <Link to={documentationHref('versioning')}>Versioning and upgrades</Link>
            </Typography>
            <Typography variant="body2" style={{ marginTop: 12 }}>
              <Link to={documentationHref('upgrade-guide')}>Upgrade Guide</Link>
            </Typography>
            {product.templateName && (
              <Typography variant="body2" style={{ marginTop: 12 }}>
                <Link to={`/releases/${product.templateName}`}>
                  Current Golden Path release
                </Link>
              </Typography>
            )}
          </InfoCard>
        </Box>
      )}

      {(descriptor?.analyticsProviders ?? []).length > 0 && (
        <Box mt={2}>
          <InfoCard title="Analytics Providers">
            <Typography variant="body2" style={{ marginBottom: 8 }}>
              BI tools and dashboards that consume this data product.
            </Typography>
            <StructuredMetadataTable
              metadata={Object.fromEntries(
                (descriptor?.analyticsProviders ?? []).map(p => [
                  p.name,
                  [
                    p.type,
                    p.url ? `→ ${p.url}` : '',
                    p.description ?? '',
                  ]
                    .filter(Boolean)
                    .join(' · '),
                ]),
              )}
            />
            <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
              Declared via <code>dataprod.platform/analytics-providers</code> annotation.
            </Typography>
          </InfoCard>
        </Box>
      )}
    </Box>
  );
}

function rememberRecent(name: string) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const key = 'pharma-data-factory.recent-products';
    const current = JSON.parse(window.localStorage.getItem(key) || '[]') as string[];
    window.localStorage.setItem(
      key,
      JSON.stringify([name, ...current.filter(item => item !== name)].slice(0, 5)),
    );
  } catch {
    return;
  }
}
