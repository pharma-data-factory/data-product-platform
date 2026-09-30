import { Button, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  formatJourneyError,
  isUnauthorizedError,
} from '@internal/platform-common';
import { outlineButtonSx } from '../controlStyles';
import { NEXORA_STATUS } from '../tokens';

const useStyles = makeStyles(theme => ({
  root: {
    alignItems: 'flex-start',
    background: NEXORA_STATUS.failBg,
    border: `1px solid ${NEXORA_STATUS.failFg}`,
    borderRadius: 12,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    padding: '12px 14px',
  },
  text: { flex: '1 1 280px' },
  title: {
    color: NEXORA_STATUS.failFg,
    fontSize: 14,
    fontWeight: 600,
  },
  message: { color: NEXORA_STATUS.failFg, fontSize: 13, marginTop: 2 },
  retry: outlineButtonSx(theme),
}));

/**
 * What a page shows instead of its content when a load failed (NXD-094).
 *
 * `role="alert"` so a screen reader announces it; the title says *what*
 * could not be loaded, so the user can tell a failed approval-status lookup
 * from a failed page. The message comes from `formatJourneyError`, which
 * never echoes a stack or a credential. No retry is offered for a
 * permission failure — pressing it again cannot succeed, and offering it
 * suggests otherwise.
 */
export function LoadError({
  error,
  what,
  onRetry,
}: {
  error: unknown;
  /** Lower-case noun phrase: "Data Products", "the approval status". */
  what: string;
  onRetry?: () => void;
}) {
  const classes = useStyles();
  const unauthorized = isUnauthorizedError(error);
  return (
    <div className={classes.root} role="alert">
      <div className={classes.text}>
        <Typography className={classes.title}>
          {unauthorized ? `Not permitted to view ${what}` : `Could not load ${what}`}
        </Typography>
        <Typography className={classes.message}>
          {formatJourneyError(error)}
        </Typography>
      </div>
      {onRetry && !unauthorized && (
        <Button className={classes.retry} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
