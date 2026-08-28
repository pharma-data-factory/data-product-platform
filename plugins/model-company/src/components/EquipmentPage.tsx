import { useLocation, useNavigate } from 'react-router-dom';
import { CircularProgress, Typography } from '@material-ui/core';
import { ModelCompanyChrome } from './shared';
import {
  DataProductLink,
  EmptyState,
  EquipmentNode,
  ErrorBanner,
  StatusBadge,
  resolveEquipmentProductName,
  resolveOeeProductName,
} from './visual';
import { useFactoryOperations } from '../hooks/useFactoryOperations';
import { findEquipment, formatQty, humanizeId } from '../factoryModel';

export function EquipmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedId = new URLSearchParams(location.search).get('id') ?? undefined;
  const { overview, sites, equipment, orders, runtimeById, error, refresh } =
    useFactoryOperations(5000);

  if (!overview && !error) {
    return (
      <ModelCompanyChrome title="Equipment">
        <CircularProgress />
      </ModelCompanyChrome>
    );
  }

  if (selectedId) {
    const eq =
      findEquipment(sites, selectedId) ?? equipment.find(e => e.id === selectedId);
    const runtime = runtimeById[selectedId] ?? eq?.runtime;
    const order = orders.find(o => o.lineId === (eq?.lineId ?? runtime?.lineId));
    const oeeProduct = resolveOeeProductName(selectedId, eq?.type);

    return (
      <ModelCompanyChrome
        title={selectedId}
        companyName={overview?.companyName}
        siteId={overview?.siteId}
        subtitle={eq ? `${humanizeId(eq.type)} · ${eq.areaId} · ${eq.lineId}` : undefined}
      >
        {error && <ErrorBanner message={error} onRetry={() => refresh()} />}
        {!eq && !runtime ? (
          <EmptyState code="EQUIPMENT NOT FOUND" message={`Unknown id ${selectedId}`} />
        ) : (
          <>
            <StatusBadge status={runtime?.state ?? 'IDLE'} />
            <div style={{ marginTop: 16, fontSize: 14, lineHeight: 1.7 }}>
              <div>
                <strong>Type</strong> {eq?.type ?? '—'}
              </div>
              <div>
                <strong>Area</strong> {eq?.areaId ?? '—'}
              </div>
              <div>
                <strong>Line</strong> {eq?.lineId ?? '—'}
              </div>
              <div>
                <strong>Order</strong> {order?.orderId ?? 'NO ACTIVE ORDER'}
              </div>
              <div>
                <strong>Batch</strong> {order?.batch ?? 'NO BATCH DATA'}
              </div>
              <div>
                <strong>Good</strong> {formatQty(runtime?.goodCount)}
              </div>
              <div>
                <strong>Reject</strong> {formatQty(runtime?.rejectCount)}
              </div>
              <div>
                <strong>Rate</strong>{' '}
                {runtime?.speed ? `${formatQty(runtime.speed)} units/min` : '—'}
              </div>
              <div>
                <strong>Reason</strong> {runtime?.reasonCode ?? '—'}
              </div>
            </div>

            <Typography variant="subtitle2" style={{ marginTop: 24, marginBottom: 8 }}>
              Data Products
            </Typography>
            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
              Operational context stays here. Analytics open in the Data Product page —
              OEE is never calculated in Model Company.
            </Typography>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <DataProductLink
                productName={oeeProduct}
                site={overview?.siteId}
                line={eq?.lineId}
                equipment={selectedId}
                label="Open OEE Data Product"
              />
              <DataProductLink
                productName={resolveEquipmentProductName()}
                site={overview?.siteId}
                line={eq?.lineId}
                equipment={selectedId}
                label="Open Equipment Data Product"
              />
            </div>
          </>
        )}
      </ModelCompanyChrome>
    );
  }

  return (
    <ModelCompanyChrome
      title="Equipment"
      companyName={overview?.companyName}
      siteId={overview?.siteId}
    >
      {error && <ErrorBanner message={error} onRetry={() => refresh()} />}
      {!equipment.length && (
        <EmptyState code="NO EQUIPMENT DATA" message="No equipment runtime loaded." />
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {equipment.map(eq => (
          <EquipmentNode
            key={eq.id}
            name={humanizeId(eq.type)}
            equipmentId={eq.id}
            runtime={runtimeById[eq.id] ?? eq.runtime}
            onSelect={() =>
              navigate(`/model-company/equipment?id=${encodeURIComponent(eq.id)}`)
            }
          />
        ))}
      </div>
    </ModelCompanyChrome>
  );
}
