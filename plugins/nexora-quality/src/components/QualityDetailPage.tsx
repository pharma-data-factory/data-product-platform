import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link, Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Grid, Typography, makeStyles } from '@material-ui/core';
import {
  ConnectivityInterface,
  DataProductHealth,
  IndustrialDataProduct,
  ProviderResult,
  industrialContractPath,
  toIndustrialDataProduct,
} from '@internal/platform-common';
import {
  ConnectivityCard,
  DataProductHeader,
  HealthCard,
  NexoraSection,
  NexoraToolPage,
  ProviderGate,
  nexoraConnectivityApiRef,
  nexoraDataQualityApiRef,
} from '@internal/plugin-nexora-common';

const useStyles = makeStyles({
  breadcrumb: {
    marginBottom: 24,
    fontSize: 14,
  },
});

export function QualityDetailPage() {
  const classes = useStyles();
  const { name } = useParams();
  const catalogApi = useApi(catalogApiRef);
  const [product, setProduct] = useState<IndustrialDataProduct>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name) {
      return;
    }
    catalogApi
      .getEntities({ filter: { kind: ['Component'] } })
      .then(response => {
        setProduct(
          response.items
            .map(toIndustrialDataProduct)
            .find(item => item?.name === name),
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [catalogApi, name]);

  if (loading) {
    return (
      <NexoraToolPage
        eyebrow="Industrial · Governance"
        title="Data Quality"
        principle="Loading..."
        copy=""
      >
        <Progress />
      </NexoraToolPage>
    );
  }

  if (!product) {
    return (
      <NexoraToolPage
        eyebrow="Industrial · Governance"
        title="Data Quality"
        principle="Product not found"
        copy=""
      >
        <Typography>This Data Product is not in the catalog.</Typography>
      </NexoraToolPage>
    );
  }

  return (
    <NexoraToolPage
      eyebrow="Industrial · Governance"
      title={product.title}
      principle="Quality and connectivity overview"
      copy={`Data Product version ${product.version}`}
    >
      <div className={classes.breadcrumb}>
        <Link to="/quality">← Back to all quality views</Link>
        {' · '}
        <Link to={industrialContractPath(product.name)}>Contract</Link>
      </div>
      <DataProductHeader
        title={product.title}
        owner={product.owner}
        lifecycle={product.lifecycle}
        version={product.version}
      />
      <QualityAndConnectivityCards entityRef={product.entityRef} />
    </NexoraToolPage>
  );
}

export function QualityAndConnectivityCards({
  entityRef,
}: {
  entityRef: string;
}) {
  const qualityApi = useApi(nexoraDataQualityApiRef);
  const connectivityApi = useApi(nexoraConnectivityApiRef);
  const [quality, setQuality] = useState<ProviderResult<DataProductHealth>>();
  const [connectivity, setConnectivity] =
    useState<ProviderResult<ConnectivityInterface[]>>();

  useEffect(() => {
    qualityApi.getQuality(entityRef).then(setQuality);
    connectivityApi.getConnectivity(entityRef).then(setConnectivity);
  }, [connectivityApi, entityRef, qualityApi]);

  const checks = quality?.data
    ? [
        quality.data.freshness,
        quality.data.completeness,
        quality.data.schema,
        quality.data.volume,
        quality.data.uniqueness,
        quality.data.timeliness,
        quality.data.nullRate,
        quality.data.contractViolations,
      ].filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];

  return (
    <>
      <NexoraSection title="Data Quality" testId="quality">
        <ProviderGate
          title="Data quality"
          result={quality}
          empty="No data-quality provider is configured."
        >
          {() => (
            <Grid container spacing={2}>
              {checks.map(check => (
                <Grid item xs={12} sm={6} md={3} key={check.label}>
                  <HealthCard check={check} />
                </Grid>
              ))}
            </Grid>
          )}
        </ProviderGate>
      </NexoraSection>
      <NexoraSection title="Connectivity" testId="connectivity">
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
      </NexoraSection>
    </>
  );
}
