/**
 * TraceMap — read-only capability → need → requirements → AC → solution tree.
 * Pure SVG / layout; no graph libraries.
 */

import type { FC } from 'react';
import { Box, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { nexoraThemeColor } from '@internal/plugin-nexora-common';

export interface TraceMapRequirement {
  id: string;
  title: string;
  acCount: number;
}

export interface TraceMapProps {
  /** Capability id → display name. */
  capabilityNames: Record<string, string>;
  businessNeed: string;
  requirements: TraceMapRequirement[];
  solutionName: string;
}

const useStyles = makeStyles(theme => ({
  root: {
    border: `1px solid ${nexoraThemeColor.border}`,
    borderRadius: 4,
    padding: theme.spacing(2),
    overflowX: 'auto',
  },
  layer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: theme.spacing(1),
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  node: {
    border: `1px solid ${nexoraThemeColor.border}`,
    borderRadius: 4,
    padding: theme.spacing(1, 1.5),
    backgroundColor: theme.palette.background.paper,
    minWidth: 120,
    maxWidth: 280,
  },
  label: {
    fontSize: 11,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: nexoraThemeColor.textMuted,
    marginBottom: 4,
  },
  connector: {
    display: 'flex',
    justifyContent: 'center',
    color: nexoraThemeColor.textMuted,
    fontSize: 18,
    lineHeight: 1,
    padding: theme.spacing(0.5, 0),
  },
  need: {
    borderLeft: `3px solid ${nexoraThemeColor.accentReadable}`,
  },
  solution: {
    borderLeft: `3px solid ${nexoraThemeColor.accentReadable}`,
  },
}));

export const TraceMap: FC<TraceMapProps> = ({
  capabilityNames,
  businessNeed,
  requirements,
  solutionName,
}) => {
  const classes = useStyles();
  const capabilityEntries = Object.entries(capabilityNames);

  return (
    <Box className={classes.root} data-testid="trace-map">
      <div className={classes.layer}>
        <Typography className={classes.label}>Capabilities</Typography>
        <div className={classes.row}>
          {capabilityEntries.length === 0 ? (
            <div className={classes.node}>
              <Typography variant="body2" color="textSecondary">
                No capabilities linked
              </Typography>
            </div>
          ) : (
            capabilityEntries.map(([id, name]) => (
              <div key={id} className={classes.node}>
                <Typography variant="body2">{name || id}</Typography>
                {name && name !== id && (
                  <Typography variant="caption" color="textSecondary">
                    {id}
                  </Typography>
                )}
              </div>
            ))
          )}
        </div>

        <div className={classes.connector} aria-hidden>
          ↓
        </div>

        <Typography className={classes.label}>Business need</Typography>
        <div className={`${classes.node} ${classes.need}`}>
          <Typography variant="body2">{businessNeed || '—'}</Typography>
        </div>

        <div className={classes.connector} aria-hidden>
          ↓
        </div>

        <Typography className={classes.label}>Requirements</Typography>
        <div className={classes.row}>
          {requirements.length === 0 ? (
            <div className={classes.node}>
              <Typography variant="body2" color="textSecondary">
                No requirements
              </Typography>
            </div>
          ) : (
            requirements.map(req => (
              <div key={req.id} className={classes.node}>
                <Typography variant="subtitle2">{req.title || req.id}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {req.id}
                </Typography>
                <Typography variant="body2" style={{ marginTop: 4 }}>
                  AC: {req.acCount}
                </Typography>
              </div>
            ))
          )}
        </div>

        <div className={classes.connector} aria-hidden>
          ↓
        </div>

        <Typography className={classes.label}>Solution</Typography>
        <div className={`${classes.node} ${classes.solution}`}>
          <Typography variant="body2">{solutionName || '—'}</Typography>
        </div>
      </div>
    </Box>
  );
};
