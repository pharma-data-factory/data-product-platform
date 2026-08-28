import { Button, Typography } from '@material-ui/core';
import { StatusBadge } from './StatusBadge';
import { NX, useVisualStyles } from './styles';

export interface ScenarioItem {
  id: string;
  name: string;
  description?: string;
}

export function ScenarioControl({
  scenarios,
  current,
  simulation,
  busy,
  onRun,
  onStart,
  onStop,
  onReset,
}: {
  scenarios: ScenarioItem[];
  current?: string;
  simulation: 'STOPPED' | 'RUNNING' | string;
  busy?: boolean;
  onRun: (scenarioId: string) => void;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}) {
  const classes = useVisualStyles();

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <StatusBadge status={simulation} />
        {current && (
          <Typography variant="body2" style={{ alignSelf: 'center', color: NX.muted }}>
            Current: <strong style={{ color: NX.text }}>{current}</strong>
          </Typography>
        )}
        <Button
          variant="outlined"
          size="small"
          disabled={busy || simulation === 'RUNNING'}
          onClick={onStart}
        >
          Start
        </Button>
        <Button
          variant="outlined"
          size="small"
          disabled={busy || simulation === 'STOPPED'}
          onClick={onStop}
        >
          Stop
        </Button>
        <Button variant="outlined" size="small" disabled={busy} onClick={onReset}>
          Reset
        </Button>
      </div>

      {!scenarios.length && (
        <Typography color="textSecondary">NO ACTIVE SCENARIO catalog loaded.</Typography>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        {scenarios.map(s => (
          <div
            key={s.id}
            className={classes.nodeCard}
            style={{ cursor: 'default' }}
          >
            <p className={classes.nodeTitle}>{s.name}</p>
            <div className={classes.nodeId}>{s.id}</div>
            {s.description && (
              <div className={classes.nodeMeta}>{s.description}</div>
            )}
            <div style={{ marginTop: 12 }}>
              <Button
                variant="contained"
                color="primary"
                size="small"
                disabled={busy}
                onClick={() => onRun(s.id)}
              >
                Run scenario
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
