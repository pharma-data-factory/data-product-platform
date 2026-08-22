import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Content, Link, Page, Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Grid, Typography } from '@material-ui/core';
import {
  CapabilityGroup,
  ContractView,
  IndustrialDataProduct,
  ProviderResult,
  apiDocsPath,
  catalogEntityPath,
  equipmentPath,
  toIndustrialDataProduct,
} from '@internal/platform-common';
import {
  CapabilityMatrix,
  DataProductHeader,
  EntityRelationshipCard,
  ProviderGate,
  StatusBadge,
  nexoraContractApiRef,
} from '@internal/plugin-nexora-common';

export function ProductContractPage() {
  const { name } = useParams();
  const catalogApi = useApi(catalogApiRef);
  const [product, setProduct] = useState<IndustrialDataProduct>();
  const [consumers, setConsumers] = useState<Array<{ label: string; to?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name) {
      return;
    }
    catalogApi
      .getEntities({ filter: { kind: ['Component'] } })
      .then(response => {
        const match = response.items
          .map(toIndustrialDataProduct)
          .find(item => item?.name === name);
        setProduct(match);
        setConsumers(
          response.items
            .filter(entity =>
              (entity.spec?.dependsOn as string[] | undefined)?.some(
                ref => ref.includes(name) || ref.includes(match?.entityRef || ''),
              ),
            )
            .filter(entity => entity.metadata.name !== name)
            .map(entity => ({
              label: entity.metadata.title || entity.metadata.name,
              to: `/data-products/${entity.metadata.name}`,
            })),
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
              <Link to="/contracts">All contracts</Link>
              {' · '}
              <Link to={`/data-products/${product.name}`}>Data Product</Link>
              {' · '}
              <Link to={catalogEntityPath(product.entityRef)}>Catalog</Link>
              {product.equipmentId && (
                <>
                  {' · '}
                  <Link to={equipmentPath(product.equipmentId)}>Equipment</Link>
                </>
              )}
            </Typography>
            <ProductContractCards
              entityRef={product.entityRef}
              producer={product.equipmentId}
              consumers={consumers}
              apiName={product.providesApis[0]}
            />
          </>
        )}
      </Content>
    </Page>
  );
}

export function ProductContractCards({
  entityRef,
  producer,
  consumers,
  apiName,
}: {
  entityRef: string;
  producer?: string;
  consumers: Array<{ label: string; to?: string }>;
  apiName?: string;
}) {
  const contractApi = useApi(nexoraContractApiRef);
  const [contract, setContract] = useState<ProviderResult<ContractView>>();
  const [capabilities, setCapabilities] =
    useState<ProviderResult<CapabilityGroup[]>>();

  useEffect(() => {
    contractApi.getContract(entityRef).then(setContract);
    contractApi.getCapabilities(entityRef).then(setCapabilities);
  }, [contractApi, entityRef]);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={8} id="contract">
        <ProviderGate
          title="Contract"
          result={contract}
          empty="No contract provider is configured. Compatibility is unknown."
        >
          {data => (
            <section aria-label="Contract">
              <Typography variant="h6">{data.name}</Typography>
              <Typography variant="body2">
                Version {data.version || 'unknown'} · {data.format || 'schema'}
              </Typography>
              <Typography variant="body2">
                Compatibility <StatusBadge state={data.compatibility} kind="health" />
              </Typography>
              {data.sourceLabel && (
                <Typography variant="caption" color="textSecondary">
                  {data.sourceLabel}. This plugin does not invent compatibility.
                </Typography>
              )}
              <ul>
                {data.fields.map(field => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
              <Typography variant="subtitle2">Contract History</Typography>
              <ul>
                {data.history.map(entry => (
                  <li key={`${entry.from}-${entry.to}`}>
                    {entry.current
                      ? `${entry.to} Current`
                      : `${entry.from} → ${entry.to} ${entry.status}`}
                  </li>
                ))}
              </ul>
              {apiName && (
                <Typography variant="body2">
                  <Link to={apiDocsPath(apiName)}>Open in API Docs</Link>
                </Typography>
              )}
            </section>
          )}
        </ProviderGate>
      </Grid>
      <Grid item xs={12} md={4}>
        <EntityRelationshipCard
          title="Producer"
          items={
            producer
              ? [{ label: producer, to: equipmentPath(producer) }]
              : []
          }
          empty="No producer equipment is linked."
        />
        <div style={{ marginTop: 12 }}>
          <EntityRelationshipCard
            title="Consumers"
            items={consumers}
            empty="No consumers depend on this product yet."
          />
        </div>
      </Grid>
      <Grid item xs={12}>
        <ProviderGate
          title="Capabilities"
          result={capabilities}
          empty="No capability metadata is configured for this Data Product."
        >
          {data => <CapabilityMatrix groups={data} />}
        </ProviderGate>
      </Grid>
    </Grid>
  );
}
