import { useEffect, useMemo, useState } from 'react';
import { Content, Link, Page, Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Chip, TextField, Typography } from '@material-ui/core';
import {
  IndustrialDataProduct,
  filterIndustrialProducts,
  industrialContractPath,
  isIndustrialDataProduct,
  toIndustrialDataProduct,
  uniqueValues,
} from '@internal/platform-common';

export function ContractExplorerPage() {
  const catalogApi = useApi(catalogApiRef);
  const [products, setProducts] = useState<IndustrialDataProduct[]>([]);
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState<string>();
  const [productType, setProductType] = useState<string>();
  const [lifecycle, setLifecycle] = useState<string>();
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

  const visible = useMemo(
    () => filterIndustrialProducts(products, { query, domain, productType, lifecycle }),
    [products, query, domain, productType, lifecycle],
  );

  return (
    <Page themeId="tool">
      <Content>
        <Typography variant="h4" gutterBottom>
          Data Product & Contract Explorer
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Industrial Data Products and their contracts. OpenAPI / AsyncAPI /
          JSON Schema rendering stays in Catalog API Docs. Local mock
          compatibility is labeled and is not a schema-registry result.
        </Typography>
        <TextField
          label="Search Data Products"
          value={query}
          onChange={event => setQuery(event.target.value)}
          fullWidth
          variant="outlined"
          size="small"
          style={{ marginBottom: 12 }}
        />
        <div aria-label="Data Product filters" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {uniqueValues(products, 'domain').map(option => (
            <Chip
              key={option}
              label={option}
              clickable
              color={domain === option ? 'primary' : 'default'}
              onClick={() => setDomain(domain === option ? undefined : option)}
            />
          ))}
          {uniqueValues(products, 'productType').map(option => (
            <Chip
              key={option}
              label={option}
              clickable
              color={productType === option ? 'primary' : 'default'}
              onClick={() => setProductType(productType === option ? undefined : option)}
            />
          ))}
          {uniqueValues(products, 'lifecycle').map(option => (
            <Chip
              key={option}
              label={option}
              clickable
              color={lifecycle === option ? 'primary' : 'default'}
              onClick={() => setLifecycle(lifecycle === option ? undefined : option)}
            />
          ))}
        </div>
        {loading && <Progress />}
        {!loading &&
          visible.map(product => (
            <Typography key={product.name} style={{ marginTop: 12 }}>
              <Link to={industrialContractPath(product.name)}>{product.title}</Link>
              {' · '}
              {product.productType || 'data product'}
              {product.version ? ` · ${product.version}` : ''}
            </Typography>
          ))}
      </Content>
    </Page>
  );
}
