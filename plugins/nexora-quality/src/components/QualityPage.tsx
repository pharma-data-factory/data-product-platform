import { useEffect, useState } from 'react';
import { Content, Link, Page, Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Typography } from '@material-ui/core';
import {
  IndustrialDataProduct,
  industrialQualityPath,
  isIndustrialDataProduct,
  toIndustrialDataProduct,
} from '@internal/platform-common';

export function QualityPage() {
  const catalogApi = useApi(catalogApiRef);
  const [products, setProducts] = useState<IndustrialDataProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    catalogApi
      .getEntities({ filter: { kind: ['Component'] } })
      .then(response => {
        setProducts(
          response.items
            .filter(isIndustrialDataProduct)
            .map(toIndustrialDataProduct)
            .filter((item): item is IndustrialDataProduct => Boolean(item)),
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [catalogApi]);

  return (
    <Page themeId="tool">
      <Content>
        <Typography variant="h4" gutterBottom>
          Data Quality & Connectivity
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Operational health for industrial Data Products. This plugin does
          not calculate quality scores and does not expose credentials. Local
          development uses the mock industrial provider, not live plant
          telemetry.
        </Typography>
        {loading && <Progress />}
        {products.map(product => (
          <Typography key={product.name} style={{ marginTop: 8 }}>
            <Link to={industrialQualityPath(product.name)}>{product.title}</Link>
          </Typography>
        ))}
      </Content>
    </Page>
  );
}
