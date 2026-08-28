import { Link as RouterLink } from 'react-router-dom';
import { Button, Typography } from '@material-ui/core';
import { StatusBadge } from './StatusBadge';
import { DataProductLink, resolveEquipmentProductName } from './DataProductLink';
import type { ActiveAlert, BatchJourneyStep } from './visualGraph';
import { NX } from './styles';

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      style={{
        background: NX.card,
        border: `1px solid ${NX.border}`,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <Typography
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: NX.muted,
          marginBottom: 10,
        }}
      >
        {title}
      </Typography>
      {children}
    </section>
  );
}

export function OverviewOpsPanel({
  scenarioId,
  scenarioRunning,
  journey,
  alerts,
  oeeConnected,
}: {
  scenarioId?: string;
  scenarioRunning?: boolean;
  journey: BatchJourneyStep[];
  alerts: ActiveAlert[];
  oeeConnected?: boolean;
}) {
  return (
    <aside aria-label="Operational context" style={{ minWidth: 0 }}>
      <Panel title="Current Scenario">
        {scenarioId ? (
          <>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                fontWeight: 700,
                color: NX.navy,
              }}
            >
              {scenarioId}
            </div>
            <div style={{ marginTop: 8 }}>
              <StatusBadge status={scenarioRunning ? 'RUNNING' : 'IDLE'} />
            </div>
            <Button
              size="small"
              component={RouterLink}
              to="/model-company/scenarios"
              style={{ marginTop: 10 }}
              color="primary"
            >
              View Scenario
            </Button>
          </>
        ) : (
          <Typography variant="body2" color="textSecondary">
            NO ACTIVE SCENARIO
          </Typography>
        )}
      </Panel>

      <Panel title="Active Batch Journey">
        {journey.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No batch genealogy available yet.
          </Typography>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {journey.map((step, index) => (
              <li
                key={step.batchId}
                style={{
                  display: 'flex',
                  gap: 10,
                  paddingBottom: index < journey.length - 1 ? 12 : 0,
                  position: 'relative',
                }}
              >
                <div
                  aria-hidden
                  style={{
                    width: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: step.complete
                        ? NX.passFg
                        : step.active
                          ? NX.teal
                          : NX.border,
                      border: step.active ? `2px solid ${NX.navy}` : undefined,
                    }}
                  />
                  {index < journey.length - 1 && (
                    <span
                      style={{
                        width: 2,
                        flex: 1,
                        background: NX.border,
                        marginTop: 2,
                        minHeight: 16,
                      }}
                    />
                  )}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      fontWeight: 600,
                      color: NX.text,
                    }}
                  >
                    {step.complete ? '✓ ' : step.active ? '● ' : '○ '}
                    {step.batchId}
                  </div>
                  <div style={{ fontSize: 12, color: NX.muted }}>
                    {step.role ?? step.materialId} · {step.status}
                  </div>
                  <Button
                    size="small"
                    component={RouterLink}
                    to={`/model-company/batches?batch=${encodeURIComponent(step.batchId)}`}
                    style={{ paddingLeft: 0 }}
                  >
                    Genealogy
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Panel title="Active Alerts">
        {alerts.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No active equipment alerts.
          </Typography>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {alerts.slice(0, 8).map(alert => (
              <li key={alert.id} style={{ marginBottom: 8, fontSize: 12 }}>
                <strong>{alert.equipmentId}</strong> · {alert.status}
                {alert.reason ? ` · ${alert.reason}` : ''}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Data Products">
        {oeeConnected ? (
          <DataProductLink
            productName="equipment-oee"
            label="Open OEE Data Product"
          />
        ) : (
          <Typography variant="body2" style={{ color: NX.muted }}>
            OEE DATA NOT CONNECTED
          </Typography>
        )}
        <div style={{ marginTop: 8 }}>
          <DataProductLink
            productName={resolveEquipmentProductName()}
            label="Equipment Data Product"
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <Button
            size="small"
            component={RouterLink}
            to="/model-company/data-products"
            color="primary"
          >
            Browse Data Products
          </Button>
        </div>
      </Panel>

      <Panel title="Quick Actions">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Button size="small" component={RouterLink} to="/model-company/scenarios">
            Open Scenarios
          </Button>
          <Button size="small" component={RouterLink} to="/model-company/material-flow">
            Material Flow
          </Button>
          <Button size="small" component={RouterLink} to="/model-company/factory">
            Factory View
          </Button>
          <Button size="small" component={RouterLink} to="/model-company/equipment">
            Equipment
          </Button>
        </div>
      </Panel>
    </aside>
  );
}
