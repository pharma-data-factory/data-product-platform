import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link, Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Grid, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
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
  NEXORA_MUTED,
  NexoraSection,
  NexoraToolPage,
  ProviderGate,
  StatusBadge,
  nexoraContractApiRef,
  useNexoraToolStyles,
} from '@internal/plugin-nexora-common';

const useStyles = makeStyles({
  crumbs: { color: NEXORA_MUTED, fontSize: 14, marginBottom: 16 },
  contractMeta: { color: NEXORA_MUTED, fontSize: 14, marginBottom: 8 },
  compatibilityRow: {
    alignItems: 'center',
    display: 'flex',
    fontSize: 14,
    gap: 8,
    marginBottom: 8,
  },
  source: {
    color: NEXORA_MUTED,
    display: 'block',
    fontSize: 12,
    marginBottom: 12,
  },
  historyItem: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  sideStack: { display: 'flex', flexDirection: 'column', gap: 12 },
});

export function ProductContractPage() {
  const classes = useStyles();
  const tool = useNexoraToolStyles();
  const { name } = useParams();
  const catalogApi = useApi(catalogApiRef);
  const [product, setProduct] = useState<IndustrialDataProduct>();
  const [consumers, setConsumers] = useState<
    Array<{ label: string; to?: string }>
  >([]);
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
                ref =>
                  ref.includes(name) ||
                  ref.includes(match?.entityRef || ''),
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

  if (loading) {
    return (
      <NexoraToolPage
        eyebrow="Industrial · Catalog"
        title="Contract"
        copy="Loading contract from the Catalog."
      >
        <Progress />
      </NexoraToolPage>
    );
  }

  if (!product) {
    return (
      <NexoraToolPage
        eyebrow="Industrial · Catalog"
        title="Contract"
        copy="This Data Product is not in the catalog."
      >
        <Typography className={classes.crumbs}>
          <Link className={tool.link} to="/contracts">
            All contracts
          </Link>
        </Typography>
      </NexoraToolPage>
    );
  }

  return (
    <NexoraToolPage
      eyebrow="Industrial · Catalog"
      title={product.title}
      principle={(() => {
        if (product.productType) {
          return `${product.productType}${
            product.version ? ` · ${product.version}` : ''
          }`;
        }
        if (product.version) {
          return `Version ${product.version}`;
        }
        return undefined;
      })()}
      copy="Contract view for an industrial Data Product. Schema rendering stays in Catalog API Docs."
      secondary="Compatibility badges reflect the configured provider. They are not a GxP validation claim."
    >
      <Typography className={classes.crumbs}>
        <Link className={tool.link} to="/contracts">
          All contracts
        </Link>
        {' · '}
        <Link className={tool.link} to={`/data-products/${product.name}`}>
          Data Product
        </Link>
        {' · '}
        <Link className={tool.link} to={catalogEntityPath(product.entityRef)}>
          Catalog
        </Link>
        {product.equipmentId ? (
          <>
            {' · '}
            <Link
              className={tool.link}
              to={equipmentPath(product.equipmentId)}
            >
              Equipment
            </Link>
          </>
        ) : null}
      </Typography>

      <NexoraSection title="Overview">
        <DataProductHeader
          title={product.title}
          owner={product.owner}
          lifecycle={product.lifecycle}
          version={product.version}
          showTitle={false}
        />
      </NexoraSection>

      <ProductContractCards
        entityRef={product.entityRef}
        producer={product.equipmentId}
        consumers={consumers}
        apiName={product.providesApis[0]}
      />
    </NexoraToolPage>
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
  const classes = useStyles();
  const tool = useNexoraToolStyles();
  const contractApi = useApi(nexoraContractApiRef);
  const [contract, setContract] =
    useState<ProviderResult<ContractView>>();
  const [capabilities, setCapabilities] =
    useState<ProviderResult<CapabilityGroup[]>>();

  useEffect(() => {
    contractApi.getContract(entityRef).then(setContract);
    contractApi.getCapabilities(entityRef).then(setCapabilities);
  }, [contractApi, entityRef]);

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8} id="contract">
          <NexoraSection title="Contract">
            <ProviderGate
              title="Contract"
              result={contract}
              empty="No contract provider is configured. Compatibility is unknown."
            >
              {data => (
                <section aria-label="Contract">
                  <Typography variant="h6">{data.name}</Typography>
                  <Typography className={classes.contractMeta}>
                    Version {data.version || 'unknown'} ·{' '}
                    {data.format || 'schema'}
                  </Typography>
                  <div className={classes.compatibilityRow}>
                    Compatibility
                    <StatusBadge
                      state={data.compatibility}
                      kind="compatibility"
                    />
                  </div>
                  {data.sourceLabel ? (
                    <Typography className={classes.source} component="span">
                      {data.sourceLabel}. This plugin does not invent
                      compatibility.
                    </Typography>
                  ) : null}
                  <ul>
                    {data.fields.map(field => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                  <Typography variant="subtitle2">Contract History</Typography>
                  <ul>
                    {data.history.map(entry => (
                      <li
                        key={`${entry.from || ''}-${entry.to}`}
                        className={classes.historyItem}
                      >
                        {entry.current
                          ? `${entry.to} Current`
                          : `${entry.from} → ${entry.to}`}
                        <StatusBadge
                          state={entry.status}
                          kind="compatibility"
                        />
                      </li>
                    ))}
                  </ul>
                  {apiName ? (
                    <Typography variant="body2">
                      <Link className={tool.link} to={apiDocsPath(apiName)}>
                        Open in API Docs
                      </Link>
                    </Typography>
                  ) : null}
                </section>
              )}
            </ProviderGate>
          </NexoraSection>
        </Grid>
        <Grid item xs={12} md={4}>
          <div className={classes.sideStack}>
            <EntityRelationshipCard
              title="Producer"
              items={
                producer
                  ? [{ label: producer, to: equipmentPath(producer) }]
                  : []
              }
              empty="No producer equipment is linked."
            />
            <EntityRelationshipCard
              title="Consumers"
              items={consumers}
              empty="No consumers depend on this product yet."
            />
          </div>
        </Grid>
      </Grid>

      <NexoraSection title="Capabilities">
        <ProviderGate
          title="Capabilities"
          result={capabilities}
          empty="No capability metadata is configured for this Data Product."
        >
          {data => <CapabilityMatrix groups={data} />}
        </ProviderGate>
      </NexoraSection>
    </>
  );
}
