import { useState } from 'react';
import { CircularProgress, Typography } from '@material-ui/core';
import { ModelCompanyChrome } from './shared';
import {
  EmptyState,
  ErrorBanner,
  GenealogyChain,
  MaterialFlowView,
} from './visual';
import { useFactoryOperations } from '../hooks/useFactoryOperations';

export function MaterialFlowPage() {
  const { overview, batches, genealogy, warehouse, error, refresh } =
    useFactoryOperations(5000);
  const [selected, setSelected] = useState<string | undefined>();

  if (!overview && !error) {
    return (
      <ModelCompanyChrome title="Material Flow">
        <CircularProgress />
      </ModelCompanyChrome>
    );
  }

  return (
    <ModelCompanyChrome
      title="Material Flow"
      companyName={overview?.companyName}
      siteId={overview?.siteId}
      subtitle="Batches · handling units · warehouse — from Model Company APIs"
    >
      {error && <ErrorBanner message={error} onRetry={() => refresh()} />}

      {!batches.length && !warehouse.length ? (
        <EmptyState
          code="NO BATCH DATA"
          message="Run a scenario to produce batch and warehouse movement."
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: 24,
          }}
          className="mc-material-grid"
        >
          <div>
            <Typography variant="subtitle2" style={{ marginBottom: 12 }}>
              FLOW
            </Typography>
            <MaterialFlowView
              batches={batches}
              genealogy={genealogy}
              warehouse={warehouse}
              simulationRunning={overview?.simulation === 'RUNNING'}
              selectedBatchId={selected}
              onSelectBatch={setSelected}
            />
          </div>
          <div>
            <Typography variant="subtitle2" style={{ marginBottom: 12 }}>
              GENEALOGY
            </Typography>
            {selected ? (
              <GenealogyChain batchId={selected} genealogy={genealogy} />
            ) : (
              <EmptyState
                code="SELECT A BATCH"
                message="Click a batch node to show upstream / downstream links."
              />
            )}
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 900px) {
          .mc-material-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </ModelCompanyChrome>
  );
}
