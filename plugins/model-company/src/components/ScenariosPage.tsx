import { useCallback, useEffect, useState } from 'react';
import { CircularProgress } from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import { modelCompanyApiRef } from '../api';
import { ModelCompanyChrome } from './shared';
import { EmptyState, ErrorBanner, ScenarioControl } from './visual';
import { useFactoryOperations } from '../hooks/useFactoryOperations';

export function ScenariosPage() {
  const api = useApi(modelCompanyApiRef);
  const { overview, error, busy, refresh, run } = useFactoryOperations(6000);
  const [scenarios, setScenarios] = useState<
    Array<{ id: string; name: string; description?: string }>
  >([]);
  const [current, setCurrent] = useState<string | undefined>();
  const [localError, setLocalError] = useState<string | null>(null);

  const loadScenarios = useCallback(async () => {
    try {
      const res = await api.getScenarios();
      const items = (res.items ?? []) as Array<{
        id: string;
        name: string;
        description?: string;
      }>;
      setScenarios(items);
      setCurrent(res.current);
      setLocalError(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    }
  }, [api]);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  if (!overview && !error) {
    return (
      <ModelCompanyChrome title="Scenario Control Center">
        <CircularProgress />
      </ModelCompanyChrome>
    );
  }

  return (
    <ModelCompanyChrome
      title="Scenario Control Center"
      companyName={overview?.companyName}
      siteId={overview?.siteId}
      subtitle="Reset · Start · Stop · Run — only backend-supported actions"
    >
      {(error || localError) && (
        <ErrorBanner
          message={error || localError || ''}
          onRetry={() => {
            refresh();
            loadScenarios();
          }}
        />
      )}
      {!scenarios.length ? (
        <EmptyState code="NO ACTIVE SCENARIO" message="Scenario catalog empty." />
      ) : (
        <ScenarioControl
          scenarios={scenarios}
          current={current ?? overview?.currentScenario}
          simulation={overview?.simulation ?? 'STOPPED'}
          busy={busy}
          onRun={id =>
            run(async () => {
              await api.runScenario(id);
              await loadScenarios();
            })
          }
          onStart={() => run(() => api.start(1))}
          onStop={() => run(() => api.stop())}
          onReset={() => run(() => api.reset(42))}
        />
      )}
    </ModelCompanyChrome>
  );
}
