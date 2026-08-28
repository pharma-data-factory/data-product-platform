import { useEffect, useState } from 'react';
import { Button, CircularProgress, Typography } from '@material-ui/core';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { useApi } from '@backstage/core-plugin-api';
import { modelCompanyApiRef } from '../api';
import { ModelCompanyChrome } from './shared';
import { DataProductLink, resolveOeeProductName } from './visual';
import { useFactoryOperations } from '../hooks/useFactoryOperations';

function useJsonLoad(loader: () => Promise<unknown>) {
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loader()
      .then(value => {
        if (!cancelled) setData(value);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, error };
}

function JsonBlock({
  title,
  data,
  error,
}: {
  title: string;
  data: unknown;
  error: string | null;
}) {
  if (error) {
    return <Typography color="error">{error}</Typography>;
  }
  if (!data) {
    return <CircularProgress size={24} />;
  }
  return (
    <>
      <Typography variant="h6" style={{ marginBottom: 12 }}>
        {title}
      </Typography>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, margin: 0 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </>
  );
}

/** @deprecated use FactoryViewPage */
export function FactoryPage() {
  return <Navigate to="/model-company/factory" replace />;
}

/** @deprecated use LinesPage */
export function LinesPage() {
  return <Navigate to="/model-company/lines" replace />;
}

/** @deprecated use EquipmentPage */
export function EquipmentPage() {
  return <Navigate to="/model-company/equipment" replace />;
}

/** @deprecated use BatchesPage */
export function BatchesPage() {
  return <Navigate to="/model-company/batches" replace />;
}

/** @deprecated use ScenariosPage */
export function ScenariosPage() {
  return <Navigate to="/model-company/scenarios" replace />;
}

export function OrdersPage() {
  const api = useApi(modelCompanyApiRef);
  const { data, error } = useJsonLoad(() => api.getOrders());
  return (
    <ModelCompanyChrome title="Orders">
      <JsonBlock title="Production orders" data={data} error={error} />
    </ModelCompanyChrome>
  );
}

export function GenealogyPage() {
  return <Navigate to="/model-company/material-flow" replace />;
}

export function CampaignPage() {
  const api = useApi(modelCompanyApiRef);
  const { equipment } = useFactoryOperations(15000);
  const [campaign, setCampaign] = useState<Awaited<
    ReturnType<typeof api.getCampaign>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api
        .getCampaign()
        .then(value => {
          if (!cancelled) setCampaign(value);
        })
        .catch(err => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : String(err));
          }
        });
    load();
    const id = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [api]);

  const sampleEq =
    equipment.find(e => /checkweigh|weigher/i.test(e.type ?? '')) ?? equipment[0];
  const fgQty =
    (campaign?.finishedGoods as { quantity?: number } | undefined)?.quantity ?? 0;
  const fgLocation =
    (campaign?.finishedGoods as { warehouseId?: string; location?: string } | undefined)
      ?.warehouseId ??
    (campaign?.finishedGoods as { location?: string } | undefined)?.location ??
    'FG Warehouse';
  const family = campaign?.productFamily ?? 'Campaign';

  return (
    <ModelCompanyChrome
      title={`${family} Campaign`}
      subtitle="Drug Product → Assembly → Packaging → Finished Goods"
    >
      {error && <Typography color="error">{error}</Typography>}
      {!campaign && !error && <CircularProgress size={24} />}
      {campaign && (
        <>
          <Typography variant="h6" gutterBottom>
            {family} · phase {campaign.phase}
          </Typography>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: 13,
              lineHeight: 1.45,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              margin: 0,
            }}
          >
            {`${String(family).toUpperCase()} PRODUCTION

Drug Product
${campaign.drugProduct.orderId ?? '—'} / ${campaign.drugProduct.batchId ?? '—'}
status=${campaign.drugProduct.status ?? '—'}  good=${campaign.drugProduct.goodQuantity ?? 0}
      |
      v
${campaign.drugProduct.goodQuantity ?? 0} Primary Containers
      |
      v
Assembly
${campaign.assembly.orderId ?? '—'} / ${campaign.assembly.batchId ?? '—'}
status=${campaign.assembly.status ?? '—'}  good=${campaign.assembly.goodQuantity ?? 0}
blocked=${campaign.assembly.blocked ?? false}
      |
      v
${campaign.assembly.goodQuantity ?? 0} Good Devices
      |
      v
Final Packaging
${campaign.packaging.orderId ?? '—'} / ${campaign.packaging.batchId ?? '—'}
status=${campaign.packaging.status ?? '—'}  good=${campaign.packaging.goodQuantity ?? 0}
blocked=${campaign.packaging.blocked ?? false}
      |
      v
${fgQty} Finished Goods
      |
      v
${fgLocation}`}
          </pre>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            <Button
              variant="outlined"
              component={RouterLink}
              to="/model-company/material-flow"
            >
              Open Material Flow
            </Button>
            <DataProductLink
              productName={resolveOeeProductName(sampleEq?.id, sampleEq?.type)}
              site={undefined}
              line={sampleEq?.lineId}
              equipment={sampleEq?.id}
              label="Open OEE Data Product"
              disabled={!sampleEq}
            />
          </div>
        </>
      )}
    </ModelCompanyChrome>
  );
}

export function WarehousePage() {
  const api = useApi(modelCompanyApiRef);
  const { data, error } = useJsonLoad(() => api.getWarehouse());
  return (
    <ModelCompanyChrome title="Warehouse">
      <JsonBlock title="Handling units" data={data} error={error} />
    </ModelCompanyChrome>
  );
}

export function EventsPage() {
  const api = useApi(modelCompanyApiRef);
  const { data, error } = useJsonLoad(() => api.getEvents(50));
  return (
    <ModelCompanyChrome title="Event Stream">
      <JsonBlock title="Recent events" data={data} error={error} />
    </ModelCompanyChrome>
  );
}

export function DataProductsPage() {
  const api = useApi(modelCompanyApiRef);
  const { overview, equipment } = useFactoryOperations(15000);
  const [items, setItems] = useState<
    Array<{ id: string; name: string; status: string; detail: string; goldenPath: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDataProducts()
      .then(res => setItems(res.items))
      .catch(err => setError(err instanceof Error ? err.message : String(err)));
  }, [api]);

  const sampleEq =
    equipment.find(e => /checkweigh|weigher/i.test(e.type ?? '')) ?? equipment[0];

  return (
    <ModelCompanyChrome title="Connected Data Products">
      {error && <Typography color="error">{error}</Typography>}
      <Typography variant="body2" style={{ marginBottom: 16 }}>
        Status comes from health probes — never faked as ACTIVE. Open the standard Data
        Product page; do not invent OEE in Model Company.
      </Typography>
      <div style={{ marginBottom: 20 }}>
        <DataProductLink
          productName={resolveOeeProductName(sampleEq?.id, sampleEq?.type)}
          site={overview?.siteId}
          line={sampleEq?.lineId}
          equipment={sampleEq?.id}
          label="Open OEE Data Product"
          disabled={!sampleEq}
        />
      </div>
      {items.map(item => (
        <div key={item.id} style={{ marginBottom: 12 }}>
          <Typography variant="subtitle1">
            {item.name} — <strong>{item.status}</strong>
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {item.goldenPath}: {item.detail}
          </Typography>
        </div>
      ))}
      {!items.length && !error && (
        <Button component={RouterLink} to="/model-company/factory" size="small">
          Back to Factory
        </Button>
      )}
    </ModelCompanyChrome>
  );
}

export function ArchitecturePage() {
  return (
    <ModelCompanyChrome title="Architecture">
      <Typography variant="body1" paragraph>
        Factory-as-Code → Model Company API → Factory Operations UI. Visualization is
        configuration-driven from the factory YAML via the API — not hardcoded Autoinjector
        topology.
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Same Backstage instance · SYNTHETIC · NON-GXP · NOT_VALIDATED
      </Typography>
    </ModelCompanyChrome>
  );
}
