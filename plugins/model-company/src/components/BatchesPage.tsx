import { useState } from 'react';
import { CircularProgress, Typography } from '@material-ui/core';
import { ModelCompanyChrome } from './shared';
import {
  BatchNode,
  EmptyState,
  ErrorBanner,
  GenealogyChain,
} from './visual';
import { useFactoryOperations } from '../hooks/useFactoryOperations';

export function BatchesPage() {
  const { overview, batches, genealogy, error, refresh } = useFactoryOperations(5000);
  const [selected, setSelected] = useState<string | undefined>();

  if (!overview && !error) {
    return (
      <ModelCompanyChrome title="Batches">
        <CircularProgress />
      </ModelCompanyChrome>
    );
  }

  return (
    <ModelCompanyChrome
      title="Batches"
      companyName={overview?.companyName}
      siteId={overview?.siteId}
    >
      {error && <ErrorBanner message={error} onRetry={() => refresh()} />}
      {!batches.length ? (
        <EmptyState
          code="NO BATCH DATA"
          message="No batches in simulation state. Run SCN-AI-001 or SCN-AI-007."
        />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {batches.map(b => (
              <BatchNode
                key={b.batchId}
                batch={b}
                selected={selected === b.batchId}
                onSelect={() => setSelected(b.batchId)}
              />
            ))}
          </div>
          {selected && (
            <>
              <Typography variant="subtitle2" style={{ marginTop: 28, marginBottom: 12 }}>
                LINEAGE — {selected}
              </Typography>
              <GenealogyChain batchId={selected} genealogy={genealogy} />
            </>
          )}
        </>
      )}
    </ModelCompanyChrome>
  );
}
