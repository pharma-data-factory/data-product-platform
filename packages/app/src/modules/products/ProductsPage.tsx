import { useEffect, useState } from 'react';
import {
  Content,
  ErrorPanel,
  Header,
  InfoCard,
  Link,
  Page,
  Progress,
} from '@backstage/core-components';
import { Button, MenuItem, TextField, Typography } from '@material-ui/core';
import { PRODUCT_TYPES, documentationUrl } from '@internal/platform-common';
import { PageHelp } from '../help/PageHelp';
import type { Product } from '@internal/platform-common';
import { useComposerClient } from './api';
import {
  NEXORA_GREY,
} from '@internal/plugin-nexora-common';

export function ProductsPage() {
  const client = useComposerClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState('');
  const [productType, setProductType] = useState('DATA_PRODUCT');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await client.listProducts();
      setProducts(result.items);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    if (!name.trim()) {
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await client.createProduct({
        name: name.trim(),
        productType,
        domain: domain.trim() || undefined,
        description: description.trim() || undefined,
      });
      setName('');
      setDomain('');
      setDescription('');
      await load();
    } catch (e) {
      setError(e as Error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Page themeId="service">
      {/* NXD-103: named for what happens here, not for what is listed. */}
      <Header
        title="Release & Governance"
        subtitle="Versions, requirements, baselines and the release gate of every product"
      />
      <Content>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 0' }}>
          <PageHelp
            step="release"
            links={[
              {
                label: 'How the release gate decides',
                to: documentationUrl(
                  '/compliance/traceability-and-gmp#16-the-release-gate',
                ),
              },
              { label: 'Back: Build', to: '/build' },
              { label: 'Next: Operate', to: '/my-products' },
            ]}
          >
            Nothing is built here. A product built under Build appears in this
            list; open it to bind approved URS requirements, add a baseline and
            take a version through the release gate. <strong>Create product</strong>{' '}
            registers a product record by hand, without a repository.
          </PageHelp>
          {/*
            Both sections sit on an InfoCard surface rather than on the app
            canvas. index.html paints html/body/#root navy for the marketing
            shell and Material UI v4 injects above it, so CssBaseline's
            background.default never applies and bare text renders near-black
            on near-black. Every readable page here answers it the same way —
            see DataProductDetailPage.
          */}
          <InfoCard title="Create product">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <TextField
                label="Name"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ minWidth: 240 }}
              />
              <TextField
                select
                label="Type"
                value={productType}
                onChange={e => setProductType(e.target.value)}
                style={{ minWidth: 200 }}
              >
                {PRODUCT_TYPES.map(type => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Domain"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                style={{ minWidth: 200 }}
              />
              <TextField
                label="Description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ minWidth: 320 }}
              />
            </div>
            <Button
              variant="contained"
              color="primary"
              disabled={creating}
              onClick={create}
              style={{ marginTop: 16 }}
            >
              Create product
            </Button>
          </InfoCard>

          <div style={{ height: 24 }} />

          <InfoCard title="Products">
          {loading && <Progress />}
          {!loading && products.length === 0 && (
            <Typography variant="body2" color="textSecondary">
              No products yet.
            </Typography>
          )}
          {!loading &&
            products.length > 0 &&
            products.map(product => (
              <section
                key={product.id}
                style={{
                  border: `1px solid ${NEXORA_GREY[200]}`,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <Link to={`/products/${product.id}`}>
                  <Typography variant="subtitle1">{product.name}</Typography>
                </Link>
                <Typography variant="body2" color="textSecondary">
                  {product.productType} · {product.domain || 'no domain'} ·{' '}
                  {product.lifecycle}
                </Typography>
                {product.description ? (
                  <Typography variant="body2">{product.description}</Typography>
                ) : null}
              </section>
            ))}
          {error ? <ErrorPanel error={error} /> : null}
          </InfoCard>
        </div>
      </Content>
    </Page>
  );
}
