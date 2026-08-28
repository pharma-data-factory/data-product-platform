import { useLocation, useNavigate } from 'react-router-dom';
import { Button, CircularProgress, Typography } from '@material-ui/core';
import { ModelCompanyChrome } from './shared';
import {
  EmptyState,
  ErrorBanner,
  LineFlow,
  StatusBadge,
} from './visual';
import { useFactoryOperations } from '../hooks/useFactoryOperations';
import { flattenLines } from '../factoryModel';

export function LinesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedLineId = new URLSearchParams(location.search).get('line') ?? undefined;
  const { overview, sites, runtimeById, error, refresh } = useFactoryOperations(5000);

  if (!overview && !error) {
    return (
      <ModelCompanyChrome title="Lines">
        <CircularProgress />
      </ModelCompanyChrome>
    );
  }

  const lines = flattenLines(sites);

  if (!selectedLineId) {
    return (
      <ModelCompanyChrome
        title="Lines"
        companyName={overview?.companyName}
        siteId={overview?.siteId}
      >
        {error && <ErrorBanner message={error} onRetry={() => refresh()} />}
        {!lines.length && (
          <EmptyState code="NO ACTIVE ORDER" message="No lines in factory topology." />
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 12,
          }}
        >
          {lines.map(line => {
            const states = line.equipment.map(
              e => runtimeById[e.id]?.state ?? e.runtime?.state ?? 'IDLE',
            );
            const state = states.find(s => s === 'MICROSTOP' || s === 'BREAKDOWN')
              ?? states.find(s => s === 'RUNNING')
              ?? states[0]
              ?? 'IDLE';
            return (
              <Button
                key={line.id}
                variant="outlined"
                style={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  padding: 16,
                  height: 'auto',
                  textTransform: 'none',
                }}
                onClick={() =>
                  navigate(`/model-company/lines?line=${encodeURIComponent(line.id)}`)
                }
              >
                <div>
                  <Typography
                    style={{
                      fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    {line.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" display="block">
                    {line.id} · {line.areaId}
                  </Typography>
                  <div style={{ marginTop: 8 }}>
                    <StatusBadge status={state} />
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </ModelCompanyChrome>
    );
  }

  const line = lines.find(l => l.id === selectedLineId);
  return (
    <ModelCompanyChrome
      title={line ? `${line.name}` : 'Line Operations'}
      companyName={overview?.companyName}
      siteId={overview?.siteId}
      subtitle={line ? `${line.id} · ${line.areaId}` : selectedLineId}
    >
      {error && <ErrorBanner message={error} onRetry={() => refresh()} />}
      <Button
        size="small"
        variant="text"
        onClick={() => navigate('/model-company/lines')}
        style={{ marginBottom: 12 }}
      >
        ← All lines
      </Button>
      {!line ? (
        <EmptyState code="LINE NOT FOUND" message={`No line ${selectedLineId} in factory model.`} />
      ) : (
        <LineFlow
          line={line}
          runtimeById={runtimeById}
          onSelectEquipment={id =>
            navigate(`/model-company/equipment?id=${encodeURIComponent(id)}`)
          }
        />
      )}
    </ModelCompanyChrome>
  );
}
