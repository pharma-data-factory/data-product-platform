import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link, Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Grid, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  ConnectivityInterface,
  MetricValue,
  NexoraAsset,
  ProviderResult,
  catalogEntityPath,
  interfaceLabels,
  relatedDataProducts,
  relatedResources,
  toNexoraAsset,
} from '@internal/platform-common';
import {
  AssetHeader,
  ConnectivityCard,
  ContextCard,
  EntityRelationshipCard,
  MetricCard,
  NexoraSection,
  NexoraToolPage,
  ProviderGate,
  RuntimeStateCard,
  productItems,
  nexoraConnectivityApiRef,
  nexoraEquipmentStateApiRef,
  nexoraMetricsApiRef,
  nexoraThemeColor,
  useNexoraToolStyles,
} from '@internal/plugin-nexora-common';

const useStyles = makeStyles({
  crumbs: {
    color: nexoraThemeColor.textMuted,
    fontSize: 14,
    marginBottom: 16,
  },
  footnote: {
    color: nexoraThemeColor.textMuted,
    fontSize: 13,
    lineHeight: 1.6,
  },
});

export function EquipmentDetailPage() {
  const classes = useStyles();
  const tool = useNexoraToolStyles();
  const { name } = useParams();
  const catalogApi = useApi(catalogApiRef);
  const metricsApi = useApi(nexoraMetricsApiRef);
  const connectivityApi = useApi(nexoraConnectivityApiRef);
  const stateApi = useApi(nexoraEquipmentStateApiRef);
  const [asset, setAsset] = useState<NexoraAsset>();
  const [products, setProducts] = useState(productItems([]));
  const [systems, setSystems] = useState<Array<{ label: string; to?: string }>>([]);
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<ProviderResult<MetricValue[]>>();
  const [connectivity, setConnectivity] =
    useState<ProviderResult<ConnectivityInterface[]>>();
  const [state, setState] = useState<ProviderResult<{ state: string; updatedAt?: string }>>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name) {
      return;
    }
    catalogApi
      .getEntities({
        filter: { kind: ['Component', 'API', 'Resource', 'System'] },
      })
      .then(async response => {
        const match = response.items
          .map(toNexoraAsset)
          .find(item => item?.name === name);
        if (!match) {
          setLoading(false);
          return;
        }
        const entity = response.items.find(item => item.metadata.name === name);
        const related = entity ? relatedResources(entity, response.items) : [];
        setAsset(match);
        setProducts(productItems(relatedDataProducts(match, response.items)));
        setInterfaces(interfaceLabels(related.filter(item => item.kind === 'Resource')));
        setSystems(
          related
            .filter(item => item.kind === 'System')
            .map(item => ({
              label: item.metadata.title || item.metadata.name,
              to: catalogEntityPath(
                `system:${item.metadata.namespace || 'default'}/${item.metadata.name}`,
              ),
            })),
        );
        const [metricResult, connectivityResult, stateResult] = await Promise.all([
          metricsApi.getMetrics(match.entityRef),
          connectivityApi.getConnectivity(match.entityRef),
          stateApi.getState(match.entityRef),
        ]);
        setMetrics(metricResult);
        setConnectivity(connectivityResult);
        setState(stateResult);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [catalogApi, connectivityApi, metricsApi, name, stateApi]);

  if (loading) {
    return (
      <NexoraToolPage
        eyebrow="Industrial · Catalog"
        title="Equipment"
        copy="Loading equipment from the Catalog."
      >
        <Progress />
      </NexoraToolPage>
    );
  }

  if (!asset) {
    return (
      <NexoraToolPage
        eyebrow="Industrial · Catalog"
        title="Equipment"
        copy="This equipment entity is not in the catalog."
      >
        <Typography className={classes.footnote}>
          <Link className={tool.link} to="/equipment">
            All equipment
          </Link>
        </Typography>
      </NexoraToolPage>
    );
  }

  return (
    <NexoraToolPage
      eyebrow="Industrial · Catalog"
      title={asset.title}
      principle={`${asset.site || 'Site'} · ${asset.area || 'Area'} · ${asset.line || 'Line'}`}
      copy="Catalog equipment detail with optional runtime providers for state, metrics, and connectivity."
      secondary="Product documentation stays in TechDocs. Runtime metrics come from configured Data Product APIs, not from this plugin."
    >
      <Typography className={classes.crumbs}>
        <Link className={tool.link} to="/equipment">
          All equipment
        </Link>
        {' · '}
        <Link className={tool.link} to={catalogEntityPath(asset.entityRef)}>
          Catalog
        </Link>
      </Typography>

      <NexoraSection title="Overview">
        <div id="overview">
          <AssetHeader
            asset={asset}
            connectivity={connectivity?.data?.[0]?.state}
            showTitle={false}
          />
        </div>
      </NexoraSection>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4} id="state">
          <ProviderGate
            title="Equipment State"
            result={state}
            empty="No runtime state integration configured."
          >
            {data => (
              <RuntimeStateCard state={data.state} updatedAt={data.updatedAt} />
            )}
          </ProviderGate>
        </Grid>
        <Grid item xs={12} md={8}>
          <ContextCard
            title="Asset context"
            fields={[
              { label: 'Manufacturer', value: asset.manufacturer },
              { label: 'Model', value: asset.model },
              { label: 'Owner', value: asset.owner },
              { label: 'Lifecycle', value: asset.lifecycle },
            ]}
          />
        </Grid>
      </Grid>

      <NexoraSection title="Metrics">
        <div id="metrics">
          <ProviderGate
            title="Metrics"
            result={metrics}
            empty="No metrics integration configured."
          >
            {data => (
              <Grid container spacing={2}>
                {data.map(metric => (
                  <Grid item xs={12} sm={6} md={3} key={metric.id}>
                    <MetricCard metric={metric} />
                  </Grid>
                ))}
              </Grid>
            )}
          </ProviderGate>
        </div>
      </NexoraSection>

      <Grid container spacing={2} id="products">
        <Grid item xs={12} md={4}>
          <EntityRelationshipCard
            title="Data Products"
            items={products}
            empty="No Data Products depend on this asset yet."
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <EntityRelationshipCard
            title="Interfaces"
            items={interfaces.map(label => ({ label }))}
            empty="No interface resources are linked in the catalog."
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <EntityRelationshipCard
            title="Systems"
            items={systems}
            empty="No systems of record are linked."
          />
        </Grid>
      </Grid>

      <NexoraSection title="Connectivity">
        <div id="connectivity">
          <ProviderGate
            title="Connectivity"
            result={connectivity}
            empty="The equipment is registered in the catalog, but no connectivity provider is configured."
          >
            {data => (
              <Grid container spacing={2}>
                {data.map(item => (
                  <Grid item xs={12} md={4} key={item.name}>
                    <ConnectivityCard item={item} />
                  </Grid>
                ))}
              </Grid>
            )}
          </ProviderGate>
        </div>
      </NexoraSection>
    </NexoraToolPage>
  );
}
