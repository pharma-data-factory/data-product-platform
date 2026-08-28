import { useLocation, useNavigate } from 'react-router-dom';
import { CircularProgress, Typography } from '@material-ui/core';
import { ModelCompanyChrome } from './shared';
import {
  AreaNode,
  EmptyState,
  ErrorBanner,
  FactoryFlow,
  buildValueStreamStages,
} from './visual';
import { useFactoryOperations } from '../hooks/useFactoryOperations';
import { aggregateAreaState } from '../factoryModel';

export function FactoryViewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const focusArea = new URLSearchParams(location.search).get('area') ?? undefined;
  const { overview, sites, orders, runtimeById, error, refresh } =
    useFactoryOperations(5000);

  if (!overview && !error) {
    return (
      <ModelCompanyChrome title="Factory View">
        <CircularProgress />
      </ModelCompanyChrome>
    );
  }

  const site = sites[0];
  const areas = site?.areas ?? [];
  const stages = buildValueStreamStages(areas, runtimeById, orders);

  return (
    <ModelCompanyChrome
      title="Factory View"
      companyName={overview?.companyName}
      siteId={overview?.siteId}
      subtitle={
        site
          ? `${site.displayName ?? site.name} · configuration-driven topology`
          : undefined
      }
    >
      {error && <ErrorBanner message={error} onRetry={() => refresh()} />}

      {!site && !error && (
        <EmptyState code="FACTORY NOT LOADED" message="No factory sites returned from API." />
      )}

      {site && (
        <>
          <Typography
            variant="h6"
            style={{
              fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
              marginBottom: 16,
            }}
          >
            {(site.displayName ?? site.name).toUpperCase()}
          </Typography>

          <FactoryFlow
            stages={stages}
            onSelectArea={areaId => {
              const area = areas.find(a => a.id === areaId);
              const firstLine = area?.lines[0]?.id;
              if (firstLine) {
                navigate(`/model-company/lines?line=${encodeURIComponent(firstLine)}`);
              }
            }}
          />

          <Typography
            variant="subtitle2"
            style={{ marginTop: 28, marginBottom: 12, letterSpacing: '0.06em' }}
          >
            AREAS
          </Typography>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {areas.map(area => {
              const lineIds = new Set(area.lines.map(l => l.id));
              const order = orders.find(o => lineIds.has(o.lineId));
              const highlighted = focusArea === area.id;
              return (
                <div
                  key={area.id}
                  style={
                    highlighted
                      ? { outline: '2px solid #00C2D9', borderRadius: 12 }
                      : undefined
                  }
                >
                  <AreaNode
                    areaName={area.name}
                    areaId={area.id}
                    lineCount={area.lines.length}
                    equipmentCount={area.lines.reduce((n, l) => n + l.equipment.length, 0)}
                    state={aggregateAreaState(area, runtimeById)}
                    orderId={order?.orderId}
                    batchId={order?.batch}
                    onSelect={() => {
                      const firstLine = area.lines[0]?.id;
                      if (firstLine) {
                        navigate(
                          `/model-company/lines?line=${encodeURIComponent(firstLine)}`,
                        );
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </ModelCompanyChrome>
  );
}
