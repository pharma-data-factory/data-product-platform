import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Content,
  ErrorPanel,
  Header,
  Page,
  Progress,
} from '@backstage/core-components';
import { Button, MenuItem, TextField, Typography } from '@material-ui/core';
import {
  COMPONENT_TYPES,
  INTERFACE_TYPES,
  TRACEABILITY_RELATIONSHIP_TYPES,
} from '@internal/platform-common';
import type {
  Product,
  ProductComponent,
  ProductVersion,
} from '@internal/platform-common';
import { useComposerClient, ProductTraceability } from './api';

export function ProductDetailPage() {
  const { productId = '' } = useParams();
  const client = useComposerClient();

  const [product, setProduct] = useState<Product | null>(null);
  const [versions, setVersions] = useState<ProductVersion[]>([]);
  const [components, setComponents] = useState<ProductComponent[]>([]);
  const [traceability, setTraceability] =
    useState<ProductTraceability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [componentName, setComponentName] = useState('');
  const [componentType, setComponentType] = useState<string>(COMPONENT_TYPES[0]);
  const [componentRef, setComponentRef] = useState('');
  const [interfaceType, setInterfaceType] = useState('');

  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [relationshipType, setRelationshipType] = useState('IMPLEMENTS');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const productData = await client.getProduct(productId);
      setProduct(productData);
      const versionList = await client.listProductVersions(productId);
      setVersions(versionList);
      if (versionList.length > 0) {
        setComponents(
          await client.listProductComponents(
            versionList[versionList.length - 1].id,
          ),
        );
      }
      setTraceability(await client.getProductTraceability(productId));
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const latestVersion = versions[versions.length - 1];

  const createVersion = async () => {
    try {
      await client.createProductVersion(productId);
      await load();
    } catch (e) {
      setError(e as Error);
    }
  };

  const addComponent = async () => {
    if (!componentName.trim() || !latestVersion) {
      return;
    }
    try {
      await client.addProductComponent(latestVersion.id, {
        componentType,
        name: componentName.trim(),
        ref: componentRef.trim() || undefined,
        interfaceType: interfaceType || undefined,
      });
      setComponentName('');
      setComponentRef('');
      setInterfaceType('');
      await load();
    } catch (e) {
      setError(e as Error);
    }
  };

  const addLink = async () => {
    if (!sourceId.trim() || !targetId) {
      return;
    }
    try {
      await client.createTraceabilityLink({
        sourceType: 'URS_REQUIREMENT_VERSION',
        sourceId: sourceId.trim(),
        relationshipType,
        targetType: 'PRODUCT_COMPONENT',
        targetId,
      });
      setSourceId('');
      await load();
    } catch (e) {
      setError(e as Error);
    }
  };

  if (loading) {
    return (
      <Page themeId="service">
        <Header title="Product" />
        <Content>
          <Progress />
        </Content>
      </Page>
    );
  }

  if (error || !product) {
    return (
      <Page themeId="service">
        <Header title="Product" />
        <Content>
          {error ? (
            <ErrorPanel error={error} />
          ) : (
            <Typography>Product not found.</Typography>
          )}
        </Content>
      </Page>
    );
  }

  return (
    <Page themeId="service">
      <Header title={product.name} subtitle={product.productType} />
      <Content>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 0' }}>
          <Typography variant="body2" color="textSecondary">
            {product.description || 'No description'} ·{' '}
            {product.domain || 'no domain'} · {product.lifecycle}
          </Typography>

          <section style={{ marginTop: 24 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Typography variant="h6">Versions</Typography>
              <Button variant="contained" color="primary" onClick={createVersion}>
                New version
              </Button>
            </div>
            {versions.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                No versions yet. Create a version to add components.
              </Typography>
            ) : (
              versions.map(version => (
                <Typography key={version.id} variant="body2">
                  {version.version} — {version.status}
                  {version === latestVersion ? ' (latest)' : ''}
                </Typography>
              ))
            )}
          </section>

          <section style={{ marginTop: 24 }}>
            <Typography variant="h6" style={{ marginBottom: 12 }}>
              Components
            </Typography>
            {latestVersion ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  <TextField
                    label="Name"
                    value={componentName}
                    onChange={e => setComponentName(e.target.value)}
                    style={{ minWidth: 200 }}
                  />
                  <TextField
                    select
                    label="Type"
                    value={componentType}
                    onChange={e => setComponentType(e.target.value)}
                    style={{ minWidth: 200 }}
                  >
                    {COMPONENT_TYPES.map(type => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Ref"
                    value={componentRef}
                    onChange={e => setComponentRef(e.target.value)}
                    style={{ minWidth: 240 }}
                  />
                  <TextField
                    select
                    label="Interface"
                    value={interfaceType}
                    onChange={e => setInterfaceType(e.target.value)}
                    style={{ minWidth: 160 }}
                  >
                    <MenuItem value="">—</MenuItem>
                    {INTERFACE_TYPES.map(type => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button variant="outlined" color="primary" onClick={addComponent}>
                    Add component
                  </Button>
                </div>
                {components.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    No components.
                  </Typography>
                ) : (
                  components.map(component => (
                    <section
                      key={component.id}
                      style={{
                        border: '1px solid #E2E8F0',
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 8,
                      }}
                    >
                      <Typography variant="subtitle1">
                        {component.name}{' '}
                        <span style={{ color: '#64748B' }}>
                          {component.componentType}
                        </span>
                      </Typography>
                      {component.ref ? (
                        <Typography variant="body2" color="textSecondary">
                          ref: {component.ref}
                        </Typography>
                      ) : null}
                    </section>
                  ))
                )}
              </>
            ) : (
              <Typography variant="body2" color="textSecondary">
                Create a version first.
              </Typography>
            )}
          </section>

          <section style={{ marginTop: 24 }}>
            <Typography variant="h6" style={{ marginBottom: 12 }}>
              Traceability
            </Typography>
            {traceability ? (
              <Typography variant="body2">
                Coverage: {traceability.coveredComponentCount}/
                {traceability.componentCount} components linked (
                {Math.round(traceability.coverage * 100)}%)
              </Typography>
            ) : null}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                marginTop: 12,
              }}
            >
              <TextField
                label="Requirement ID"
                value={sourceId}
                onChange={e => setSourceId(e.target.value)}
                placeholder="URS-OUT-001"
                style={{ minWidth: 200 }}
              />
              <TextField
                select
                label="Component"
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
                style={{ minWidth: 240 }}
              >
                <MenuItem value="">Select…</MenuItem>
                {components.map(component => (
                  <MenuItem key={component.id} value={component.id}>
                    {component.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Relationship"
                value={relationshipType}
                onChange={e => setRelationshipType(e.target.value)}
                style={{ minWidth: 180 }}
              >
                {TRACEABILITY_RELATIONSHIP_TYPES.map(type => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
              <Button variant="outlined" color="primary" onClick={addLink}>
                Link requirement
              </Button>
            </div>
            {traceability && traceability.links.length > 0
              ? traceability.links.map(link => (
                  <Typography key={link.id} variant="body2" style={{ marginTop: 4 }}>
                    {link.sourceId} —{link.relationshipType}→ {link.targetId}
                  </Typography>
                ))
              : null}
          </section>
        </div>
      </Content>
    </Page>
  );
}
