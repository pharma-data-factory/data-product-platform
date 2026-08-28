import { useEffect, useState } from 'react';
import { Link, Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Typography, makeStyles } from '@material-ui/core';
import {
  IndustrialDataProduct,
  industrialQualityPath,
  isIndustrialDataProduct,
  toIndustrialDataProduct,
} from '@internal/platform-common';
import {
  NEXORA_BORDER,
  NEXORA_MUTED,
  NexoraSection,
  NexoraToolPage,
  useNexoraToolStyles,
} from '@internal/plugin-nexora-common';

const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  },
  productCard: {
    background: '#F8FAFC',
    border: `1px solid ${NEXORA_BORDER}`,
    borderRadius: 12,
    padding: '16px',
    cursor: 'pointer',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    '&:hover': {
      borderColor: '#00C2D9',
      boxShadow: '0 2px 8px rgba(0,194,217,0.12)',
    },
  },
  productTitle: {
    fontSize: 16,
    fontWeight: 600,
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    marginBottom: 4,
  },
  productMeta: {
    fontSize: 13,
    color: NEXORA_MUTED,
  },
  empty: {
    color: NEXORA_MUTED,
    fontSize: 14,
  },
});

export function QualityPage() {
  const classes = useStyles();
  const tool = useNexoraToolStyles();
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
    <NexoraToolPage
      eyebrow="Industrial · Governance"
      title="Data Quality & Connectivity"
      principle="Operational health for Data Products."
      copy="Quality gates, schema validation, freshness, connectivity and more. This is not GxP validation and does not calculate quality scores."
      secondary="Local development uses the mock industrial provider and does not expose production credentials or live plant telemetry."
    >
      {loading && <Progress />}
      {!loading && products.length === 0 && (
        <Typography className={classes.empty}>
          No Data Products in the catalog yet.
        </Typography>
      )}
      {products.length > 0 && (
        <NexoraSection title="Products" testId="products">
          <div className={classes.grid}>
            {products.map(product => (
              <Link
                key={product.name}
                to={industrialQualityPath(product.name)}
                className={tool.link}
              >
                <div className={classes.productCard}>
                  <div className={classes.productTitle}>{product.title}</div>
                  <div className={classes.productMeta}>{product.name}</div>
                  {product.owner && (
                    <div className={classes.productMeta}>Owner: {product.owner}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </NexoraSection>
      )}
    </NexoraToolPage>
  );
}
