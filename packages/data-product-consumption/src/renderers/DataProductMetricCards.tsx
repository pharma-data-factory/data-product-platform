import { Grid, Paper, Typography } from '@material-ui/core';

export function DataProductMetricCards({
  metrics,
}: {
  metrics: Array<{ label: string; value: string | number; hint?: string }>;
}) {
  if (!metrics.length) {
    return <Typography color="textSecondary">No metrics available.</Typography>;
  }
  return (
    <Grid container spacing={2}>
      {metrics.map(m => (
        <Grid item xs={6} sm={4} md={3} key={m.label}>
          <Paper variant="outlined" style={{ padding: 16 }}>
            <Typography variant="caption" color="textSecondary">
              {m.label}
            </Typography>
            <Typography variant="h5">{m.value}</Typography>
            {m.hint && (
              <Typography variant="caption" color="textSecondary">
                {m.hint}
              </Typography>
            )}
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
