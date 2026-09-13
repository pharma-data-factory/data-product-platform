/**
 * ImpactGraph — simple ADDED / MODIFIED / REMOVED columns for a ChangeSet.
 * CSS columns only; no graph libraries.
 */

import type { FC } from 'react';
import { Box, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  NEXORA_STATUS,
  nexoraThemeColor,
} from '@internal/plugin-nexora-common';
import type { ChangeSet, RequirementChange } from '../../api/types';

export interface ImpactGraphProps {
  changeSet: ChangeSet;
}

const COLUMN_META: Array<{
  key: 'ADDED' | 'MODIFIED' | 'REMOVED';
  label: string;
  color: string;
}> = [
  { key: 'ADDED', label: 'Added', color: NEXORA_STATUS.success },
  { key: 'MODIFIED', label: 'Modified', color: NEXORA_STATUS.warning },
  { key: 'REMOVED', label: 'Removed', color: NEXORA_STATUS.error },
];

function titleFor(change: RequirementChange): string {
  const version = change.currentVersion ?? change.previousVersion;
  return version?.title || change.requirementId;
}

const useStyles = makeStyles(theme => ({
  root: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      gridTemplateColumns: '1fr',
    },
  },
  column: {
    border: `1px solid ${nexoraThemeColor.border}`,
    borderRadius: 4,
    minHeight: 120,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: theme.spacing(1, 1.5),
    color: NEXORA_STATUS.onAccent,
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  list: {
    padding: theme.spacing(1),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.75),
    flex: 1,
  },
  item: {
    border: `1px solid ${nexoraThemeColor.border}`,
    borderRadius: 4,
    padding: theme.spacing(0.75, 1),
    backgroundColor: theme.palette.background.paper,
  },
  empty: {
    padding: theme.spacing(1),
    color: theme.palette.text.secondary,
    fontSize: 13,
  },
}));

export const ImpactGraph: FC<ImpactGraphProps> = ({ changeSet }) => {
  const classes = useStyles();

  return (
    <Box className={classes.root} data-testid="impact-graph">
      {COLUMN_META.map(col => {
        const items = changeSet.changes.filter(c => c.changeType === col.key);
        return (
          <div key={col.key} className={classes.column}>
            <div
              className={classes.header}
              style={{ backgroundColor: col.color }}
            >
              {col.label} ({items.length})
            </div>
            <div className={classes.list}>
              {items.length === 0 ? (
                <Typography className={classes.empty}>None</Typography>
              ) : (
                items.map(change => (
                  <div key={change.requirementId} className={classes.item}>
                    <Typography variant="body2">{titleFor(change)}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {change.requirementId}
                    </Typography>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </Box>
  );
};
