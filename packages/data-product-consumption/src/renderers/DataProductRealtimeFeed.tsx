import { Button, Paper, Typography } from '@material-ui/core';
import type { StreamEvent } from '../types';

export function DataProductRealtimeFeed({
  events,
  status,
  eventCount,
  onPause,
  onResume,
}: {
  events: StreamEvent[];
  status: string;
  eventCount: number;
  onPause: () => void;
  onResume: () => void;
}) {
  return (
    <Paper variant="outlined" style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <Typography variant="body2">
          Connection: <strong>{status}</strong> · Events: {eventCount}
        </Typography>
        <Button size="small" variant="outlined" onClick={onPause}>
          Pause
        </Button>
        <Button size="small" variant="outlined" onClick={onResume}>
          Resume
        </Button>
      </div>
      {events[0] ? (
        <Typography variant="body2" gutterBottom>
          Latest: {events[0].timestamp} · source={events[0].source ?? '—'} · quality=
          {events[0].dataQuality ?? '—'}
        </Typography>
      ) : (
        <Typography color="textSecondary">Waiting for events…</Typography>
      )}
      <pre style={{ fontSize: 12, maxHeight: 320, overflow: 'auto' }}>
        {JSON.stringify(events.slice(0, 20), null, 2)}
      </pre>
    </Paper>
  );
}

/** Lightweight timeseries fallback without chart library — table of points. */
export function DataProductTimeseries({
  points,
}: {
  points: Array<{ timestamp: string; value: number; label?: string }>;
}) {
  if (!points.length) {
    return (
      <Typography color="textSecondary">
        Timeseries capability declared but no points available (NOT_AVAILABLE).
      </Typography>
    );
  }
  return (
    <Paper variant="outlined" style={{ padding: 12 }}>
      <Typography variant="caption">Timeseries (table fallback — no chart lib in v1)</Typography>
      <pre style={{ fontSize: 12 }}>{JSON.stringify(points.slice(-50), null, 2)}</pre>
    </Paper>
  );
}
