import { useEffect, useState } from 'react';
import {
  Content,
  Header,
  InfoCard,
  Page,
  Progress,
  StructuredMetadataTable,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Chip, Grid, Typography } from '@material-ui/core';
import {
  commercialCardStatus,
  formatJourneyError,
  isUnauthorizedError,
} from '@internal/platform-common';
import { JourneyState } from '@internal/plugin-data-products';
import {
  entitlementApiRef,
  type MyProductsSnapshot,
} from '@internal/plugin-marketplace';

export function MyAccessPage() {
  const api = useApi(entitlementApiRef);
  const [data, setData] = useState<MyProductsSnapshot>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getProducts()
      .then(result => {
        setData(result);
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
  }, [api]);

  const goldenPaths = data?.products.filter(product => product.productType === 'GOLDEN_PATH') ?? [];
  const platform = data?.products.filter(product => product.productType !== 'GOLDEN_PATH') ?? [];

  return (
    <Page themeId="tool">
      <Header
        title="My Access"
        subtitle="Commercial capabilities for this organization"
      />
      <Content>
        {loading && <Progress />}
        {error && (
          <JourneyState
            title={isUnauthorizedError(error) ? 'Unauthorized' : 'Unable to load access'}
            message={formatJourneyError(error)}
          />
        )}
        {data && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <InfoCard title="Organization">
                <StructuredMetadataTable
                  metadata={{
                    Organization: data.organizationId,
                    Edition: data.edition,
                  }}
                />
                <Typography variant="body2" style={{ marginTop: 12 }}>
                  Technical certification (CERTIFIED / RELEASED) is separate
                  from commercial entitlement.
                </Typography>
              </InfoCard>
            </Grid>
            <Grid item xs={12} md={8}>
              <InfoCard title="Golden Paths">
                {goldenPaths.map(product => {
                  const status =
                    product.accessState === 'PENDING_ACCESS'
                      ? 'PENDING_ACCESS'
                      : commercialCardStatus(product, product.entitled);
                  return (
                    <Typography key={product.productId} variant="body2" style={{ marginBottom: 8 }}>
                      {product.displayName}{' '}
                      <Chip size="small" label={status} />
                    </Typography>
                  );
                })}
              </InfoCard>
              <InfoCard title="Platform access">
                {platform.map(product => {
                  const status = commercialCardStatus(product, product.entitled);
                  return (
                    <Typography key={product.productId} variant="body2" style={{ marginBottom: 8 }}>
                      {product.displayName}{' '}
                      <Chip size="small" label={status} />
                    </Typography>
                  );
                })}
                <Typography variant="body2" style={{ marginTop: 12 }}>
                  Future commercial capabilities appear as PLANNED or FUTURE.
                  There is no purchase flow in this Control Plane.
                </Typography>
              </InfoCard>
            </Grid>
          </Grid>
        )}
      </Content>
    </Page>
  );
}
