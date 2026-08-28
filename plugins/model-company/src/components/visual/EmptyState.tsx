import { Typography } from '@material-ui/core';
import { NX, useVisualStyles } from './styles';

export function EmptyState({
  code,
  message,
}: {
  code: string;
  message?: string;
}) {
  const classes = useVisualStyles();
  return (
    <div className={classes.empty} role="status">
      <Typography
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 12,
          fontWeight: 700,
          color: NX.navy,
          letterSpacing: '0.08em',
        }}
      >
        {code}
      </Typography>
      {message && (
        <Typography variant="body2" style={{ marginTop: 6, color: NX.muted }}>
          {message}
        </Typography>
      )}
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      style={{
        background: NX.dangerBg,
        color: NX.dangerFg,
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 16,
        fontSize: 14,
      }}
    >
      {message}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginLeft: 12,
            background: 'transparent',
            border: `1px solid ${NX.dangerFg}`,
            color: NX.dangerFg,
            borderRadius: 6,
            padding: '2px 10px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
