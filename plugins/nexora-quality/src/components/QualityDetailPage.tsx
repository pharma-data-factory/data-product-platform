import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Content, Link, Page, Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Grid, Typography } from '@material-ui/core';
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
  ProviderGate,
  nexoraConnectivityApiRef,
  nexoraDataQualityApiRef,
} from '@internal/plugin-nexora-common';

export function QualityDetailPage() {
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

  return (
    <Page themeId="tool">
      <Content>
        {loading && <Progress />}
        {!loading && !product && (
          <Typography>This Data Product is not in the catalog.</Typography>
        )}
        {product && (
          <>
            <DataProductHeader
              title={product.title}
              owner={product.owner}
              lifecycle={product.lifecycle}
              version={product.version}
            />
            <Typography variant="body2" paragraph>
              <Link to="/quality">All quality views</Link>
              {' · '}
              <Link to={industrialContractPath(product.name)}>Contract</Link>
            </Typography>
            <QualityAndConnectivityCards entityRef={product.entityRef} />
          </>
        )}
      </Content>
    </Page>
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
    <Grid container spacing={2}>
      <Grid item xs={12}>
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
      </Grid>
      <Grid item xs={12} id="connectivity">
        <Typography variant="h6">Connectivity</Typography>
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
      </Grid>
    </Grid>
  );
}
