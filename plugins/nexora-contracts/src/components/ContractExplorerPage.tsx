import { useEffect, useMemo, useState } from 'react';
import { Link, Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Chip, TextField, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  IndustrialDataProduct,
  filterIndustrialProducts,
  industrialContractPath,
  isIndustrialDataProduct,
  toIndustrialDataProduct,
  uniqueValues,
} from '@internal/platform-common';
import {
  NEXORA_BORDER,
  NEXORA_MUTED,
  NexoraSection,
  NexoraToolPage,
  filterChipSx,
  nexoraThemeColor,
  useNexoraToolStyles,
} from '@internal/plugin-nexora-common';

const useStyles = makeStyles(theme => ({
  search: { marginBottom: 12 },
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: filterChipSx(theme, false),
  filterChipSelected: filterChipSx(theme, true),
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: {
    background: '#F8FAFC',
    border: `1px solid ${NEXORA_BORDER}`,
    borderRadius: 12,
    padding: '12px 14px',
  },
  meta: { color: NEXORA_MUTED, fontSize: 13, marginTop: 4 },
  empty: { color: nexoraThemeColor.text, fontSize: 14 },
}));

export function ContractExplorerPage() {
  const classes = useStyles();
  const tool = useNexoraToolStyles();
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
    () =>
      filterIndustrialProducts(products, {
        query,
        domain,
        productType,
        lifecycle,
      }),
    [products, query, domain, productType, lifecycle],
  );

  return (
    <NexoraToolPage
      eyebrow="Industrial · Catalog"
      title="Data Product & Contract Explorer"
      principle="Contracts for industrial Data Products."
      copy="Browse products and open their contract views. OpenAPI / AsyncAPI / JSON Schema rendering stays in Catalog API Docs."
      secondary="Local mock compatibility is labeled and is not a schema-registry result."
    >
      <TextField
        className={classes.search}
        label="Search Data Products"
        value={query}
        onChange={event => setQuery(event.target.value)}
        fullWidth
        variant="outlined"
        size="small"
      />
      <div className={classes.filters} aria-label="Data Product filters">
        {uniqueValues(products, 'domain').map(option => (
          <Chip
            key={`domain-${option}`}
            label={option}
            clickable
            className={
              domain === option ? classes.filterChipSelected : classes.filterChip
            }
            onClick={() => setDomain(domain === option ? undefined : option)}
          />
        ))}
        {uniqueValues(products, 'productType').map(option => (
          <Chip
            key={`type-${option}`}
            label={option}
            clickable
            className={
              productType === option
                ? classes.filterChipSelected
                : classes.filterChip
            }
            onClick={() =>
              setProductType(productType === option ? undefined : option)
            }
          />
        ))}
        {uniqueValues(products, 'lifecycle').map(option => (
          <Chip
            key={`lifecycle-${option}`}
            label={option}
            clickable
            className={
              lifecycle === option
                ? classes.filterChipSelected
                : classes.filterChip
            }
            onClick={() =>
              setLifecycle(lifecycle === option ? undefined : option)
            }
          />
        ))}
      </div>
      {loading && <Progress />}
      {!loading && visible.length === 0 && (
        <Typography className={classes.empty}>
          No Data Products match the current filters.
        </Typography>
      )}
      {!loading && visible.length > 0 && (
        <NexoraSection title="Data Products">
          <div className={classes.list}>
            {visible.map(product => (
              <div key={product.name} className={classes.card}>
                <Link
                  className={tool.link}
                  to={industrialContractPath(product.name)}
                >
                  {product.title}
                </Link>
                <div className={classes.meta}>
                  {product.productType || 'data product'}
                  {product.version ? ` · ${product.version}` : ''}
                  {product.domain ? ` · ${product.domain}` : ''}
                </div>
              </div>
            ))}
          </div>
        </NexoraSection>
      )}
    </NexoraToolPage>
  );
}
