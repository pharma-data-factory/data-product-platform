import { useMemo } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Button, CircularProgress, Typography } from '@material-ui/core';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { useTheme } from '@material-ui/core/styles';
import { Metric, ModelCompanyChrome, useModelCompanyStyles } from './shared';
import {
  EmptyState,
  ErrorBanner,
  OverviewOpsPanel,
  StatusBadge,
  ValueStreamCanvas,
  buildFactoryValueStream,
} from './visual';
import { formatQty } from '../factoryModel';
import { useFactoryOperations } from '../hooks/useFactoryOperations';
import { NX } from './visual/styles';

export interface OverviewPageProps {
  publicMode?: boolean;
  onBack?: () => void;
  onSignIn?: () => void;
}

function oeeConnectivityBadgeStatus(
  oee: string | undefined,
): 'AVAILABLE' | 'SETUP' | 'IDLE' {
  if (oee === 'CONNECTED') {
    return 'AVAILABLE';
  }
  if (oee === 'INSUFFICIENT_DATA') {
    return 'SETUP';
  }
  return 'IDLE';
}

function PublicActions({
  onBack,
  onSignIn,
}: Readonly<{ onBack?: () => void; onSignIn?: () => void }>) {
  return (
    <>
      <Button
        variant="outlined"
        onClick={onBack}
        style={{ color: '#F8FAFC', borderColor: '#64748B' }}
      >
        Back to website
      </Button>
      <Button variant="contained" color="primary" onClick={onSignIn}>
        Sign in for controls
      </Button>
    </>
  );
}

function SimulationActions({
  busy,
  simulationRunning,
  simulationStopped,
  onStart,
  onStop,
  onReset,
}: Readonly<{
  busy: boolean;
  simulationRunning: boolean;
  simulationStopped: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}>) {
  return (
    <>
      <Button
        variant="contained"
        color="primary"
        disabled={busy || simulationRunning}
        onClick={onStart}
      >
        Start
      </Button>
      <Button
        variant="outlined"
        disabled={busy || simulationStopped}
        onClick={onStop}
        style={{ color: '#F8FAFC', borderColor: '#64748B' }}
      >
        Stop
      </Button>
      <Button
        variant="outlined"
        disabled={busy}
        onClick={onReset}
        style={{ color: '#F8FAFC', borderColor: '#64748B' }}
      >
        Reset
      </Button>
    </>
  );
}

export function OverviewPage({
  publicMode = false,
  onBack,
  onSignIn,
}: OverviewPageProps = {}) {
  const classes = useModelCompanyStyles();
  const navigate = useNavigate();
  const theme = useTheme();
  const stackPanel = useMediaQuery(theme.breakpoints.down('md'));
  const singleColumn = stackPanel || publicMode;
  const {
    overview,
    sites,
    orders,
    batches,
    warehouse,
    runtimeById,
    factory,
    error,
    busy,
    refresh,
    run,
    api,
  } = useFactoryOperations(4000, { publicDemo: publicMode });

  const valueStream = useMemo(
    () =>
      buildFactoryValueStream({
        factory,
        sites,
        runtimeById,
        orders,
        batches,
        warehouse,
      }),
    [factory, sites, runtimeById, orders, batches, warehouse],
  );
  const { stages: lanes, alerts, batches: journey, kpis, oeeConnected: oeeConfigured } =
    valueStream;
  const oeeConnected =
    overview?.connectivity?.oee === 'CONNECTED' ||
    overview?.connectivity?.oee === 'INSUFFICIENT_DATA' ||
    oeeConfigured;

  if (!overview && !error) {
    return (
      <ModelCompanyChrome>
        <CircularProgress />
      </ModelCompanyChrome>
    );
  }

  const simulationRunning = overview?.simulation === 'RUNNING';
  const rejectRate =
    kpis.produced + kpis.rejects > 0
      ? `${((100 * kpis.rejects) / (kpis.produced + kpis.rejects)).toFixed(2)}%`
      : '—';

  return (
    <ModelCompanyChrome
      title={overview?.companyName ?? 'Nexora Model Pharma'}
      companyName={overview?.companyName}
      siteId={overview?.siteId}
      publicMode={publicMode}
      subtitle={
        overview
          ? `${overview.siteName} · Manufacturing value stream · SYNTHETIC · NON-GXP`
          : undefined
      }
      actions={
        <div className={classes.actions} style={{ marginTop: 16 }}>
          {publicMode ? (
            <PublicActions onBack={onBack} onSignIn={onSignIn} />
          ) : (
            <SimulationActions
              busy={busy}
              simulationRunning={simulationRunning}
              simulationStopped={overview?.simulation === 'STOPPED'}
              onStart={() => run(() => api.start(1))}
              onStop={() => run(() => api.stop())}
              onReset={() => run(() => api.reset(42))}
            />
          )}
        </div>
      }
    >
      {error && <ErrorBanner message={error} onRetry={() => refresh()} />}

      {overview?.simulation === 'STOPPED' && (
        <div style={{ marginBottom: 16 }}>
          <EmptyState
            code="SIMULATION STOPPED"
            message={
              publicMode
                ? 'The public demo is read-only. Sign in to control the simulation.'
                : 'Start simulation or run a scenario to animate the manufacturing value stream.'
            }
          />
        </div>
      )}

      {overview && (
        <>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 8,
              alignItems: 'center',
            }}
          >
                        <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 8,
                width: '100%',
              }}
            >
              <StatusBadge
                status={
                  overview.connectivity?.simulation === 'RUNNING' ||
                  overview.simulation === 'RUNNING'
                    ? 'RUNNING'
                    : 'STOPPED'
                }
                label={`SIMULATION ${
                  overview.connectivity?.simulation ?? overview.simulation
                }`}
              />
              <StatusBadge
                status={
                  overview.connectivity?.mqtt === 'CONNECTED'
                    ? 'AVAILABLE'
                    : 'IDLE'
                }
                label={`MQTT ${overview.connectivity?.mqtt ?? 'UNKNOWN'}`}
              />
              <StatusBadge
                status={
                  overview.connectivity?.uns === 'ACTIVE'
                    ? 'AVAILABLE'
                    : 'IDLE'
                }
                label={`UNS ${overview.connectivity?.uns ?? 'NOT_CONNECTED'}`}
              />
              <StatusBadge
                status={oeeConnectivityBadgeStatus(overview.connectivity?.oee)}
                label={`OEE DATA PRODUCT ${
                  overview.connectivity?.oee ?? 'NOT_CONNECTED'
                }`}
              />
            </div>
            <Typography variant="body2" color="textSecondary">
              Scenario <strong>{overview.currentScenario || 'NONE'}</strong>
              {!overview.currentScenario && ' — NO ACTIVE SCENARIO'}
            </Typography>
          </div>

          <div className={classes.grid} aria-label="Operational KPIs">
            <Metric
              label="Active Order"
              value={kpis.activeOrder?.orderId ?? '—'}
            />
            <Metric
              label="Active Batch"
              value={kpis.activeBatch?.batchId ?? '—'}
            />
            <Metric
              label="Produced / Target"
              value={
                kpis.target > 0
                  ? `${formatQty(kpis.produced)} / ${formatQty(kpis.target)}`
                  : formatQty(kpis.produced)
              }
            />
            <Metric
              label="Rejects"
              value={`${formatQty(kpis.rejects)} (${rejectRate})`}
            />
            <Metric label="Packaging HUs" value={kpis.packagingHus} />
            <Metric label="Finished Goods HUs" value={kpis.fgHus} />
          </div>

          <Typography
            variant="h6"
            style={{
              marginTop: 28,
              marginBottom: 4,
              fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
              color: NX.navy,
            }}
          >
            Pharma manufacturing value stream
          </Typography>
          <Typography
            variant="body2"
            color="textSecondary"
            style={{ marginBottom: 14, maxWidth: 760 }}
          >
            Solid arrows follow the main product path. Dashed supply chips show
            device components and packaging materials entering the process.
            Layout is driven by Factory-as-Code areas and equipment types — not
            hard-coded equipment IDs.
          </Typography>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: singleColumn
                ? '1fr'
                : 'minmax(0, 1fr) minmax(240px, 300px)',
              gap: 16,
              alignItems: 'start',
            }}
          >
            <div>
              {lanes.length === 0 ? (
                <EmptyState
                  code="NO FACTORY AREAS"
                  message="Factory topology has no areas yet, or the factory model failed to load."
                />
              ) : (
                <ValueStreamCanvas
                  lanes={lanes}
                  simulationRunning={simulationRunning}
                  onSelectEquipment={
                    publicMode
                      ? undefined
                      : id =>
                          navigate(
                            `/model-company/equipment?id=${encodeURIComponent(id)}`,
                          )
                  }
                  onSelectMaterial={
                    publicMode
                      ? undefined
                      : () => navigate('/model-company/material-flow')
                  }
                  onSelectArea={
                    publicMode
                      ? undefined
                      : areaId =>
                          navigate(
                            `/model-company/factory?area=${encodeURIComponent(areaId)}`,
                          )
                  }
                />
              )}
            </div>
            {!publicMode && (
              <OverviewOpsPanel
                scenarioId={overview.currentScenario || undefined}
                scenarioRunning={
                  simulationRunning && Boolean(overview.currentScenario)
                }
                journey={journey}
                alerts={alerts}
                oeeConnected={oeeConnected}
              />
            )}
          </div>

          {!publicMode && (
            <div style={{ marginTop: 16 }} className={classes.actions}>
              <Button
                variant="contained"
                color="primary"
                component={RouterLink}
                to="/model-company/factory"
              >
                Open Factory View
              </Button>
              <Button
                variant="outlined"
                component={RouterLink}
                to="/model-company/scenarios"
              >
                Scenario Control
              </Button>
              <Button
                variant="outlined"
                component={RouterLink}
                to="/model-company/material-flow"
              >
                Material Flow
              </Button>
            </div>
          )}
        </>
      )}
    </ModelCompanyChrome>
  );
}
