/**
 * Portfolio coverage — capabilities vs linked URS requirement sets.
 */

import { useEffect, useMemo, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '@backstage/core-plugin-api';
import {
  Header,
  Page,
  Content,
  Progress,
  ErrorPanel,
  Link,
} from '@backstage/core-components';
import {
  Box,
  Chip,
  LinearProgress,
  Typography,
  makeStyles,
} from '@material-ui/core';
import { NEXORA_BORDER, NEXORA_STATUS } from '@internal/plugin-nexora-common';
import { ursComposerApiRef } from '../api/ursComposerApi';
import type { BusinessCapability, RequirementSet } from '../api/types';

interface CoverageRow {
  capability: BusinessCapability;
  sets: RequirementSet[];
  covered: boolean;
}

const useStyles = makeStyles(theme => ({
  summary: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
    alignItems: 'center',
  },
  barWrap: {
    flex: '1 1 240px',
    minWidth: 200,
  },
  row: {
    border: `1px solid ${NEXORA_BORDER}`,
    borderRadius: 4,
    padding: theme.spacing(1.5, 2),
    marginBottom: theme.spacing(1),
  },
  rowHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(0.5),
  },
  setList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
}));

export const PortfolioCoveragePage: FC = () => {
  const api = useApi(ursComposerApiRef);
  const navigate = useNavigate();
  const classes = useStyles();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [capabilities, setCapabilities] = useState<BusinessCapability[]>([]);
  const [requirementSets, setRequirementSets] = useState<RequirementSet[]>([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([api.listCapabilities(), api.listRequirementSets()])
      .then(([caps, sets]) => {
        if (!mounted) return;
        setCapabilities(
          Array.isArray(caps) ? caps : caps.items ?? [],
        );
        setRequirementSets(sets.items ?? []);
      })
      .catch(err => {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [api]);

  const rows: CoverageRow[] = useMemo(() => {
    return capabilities.map(capability => {
      const sets = requirementSets.filter(set =>
        (set.businessCapabilityRefs ?? []).includes(capability.id),
      );
      return { capability, sets, covered: sets.length > 0 };
    });
  }, [capabilities, requirementSets]);

  const coveredCount = rows.filter(r => r.covered).length;
  const total = rows.length;
  const coveragePct = total === 0 ? 0 : Math.round((coveredCount / total) * 100);

  return (
    <Page themeId="tool">
      <Header
        title="Portfolio Coverage"
        subtitle="Business capabilities linked to URS requirement sets"
      />
      <Content>
        {loading && <Progress />}
        {error && (
          <Box marginBottom={2}>
            <ErrorPanel error={error} />
          </Box>
        )}

        {!loading && !error && (
          <>
            <div className={classes.summary}>
              <Chip
                label={`${coveredCount} covered`}
                size="small"
                style={{
                  backgroundColor: NEXORA_STATUS.success,
                  color: NEXORA_STATUS.onAccent,
                  fontWeight: 600,
                }}
              />
              <Chip
                label={`${total - coveredCount} uncovered`}
                size="small"
                style={{
                  backgroundColor:
                    total - coveredCount > 0
                      ? NEXORA_STATUS.warning
                      : NEXORA_STATUS.pending,
                  color: NEXORA_STATUS.onAccent,
                  fontWeight: 600,
                }}
              />
              <Typography variant="body2" color="textSecondary">
                {coveragePct}% of capabilities have at least one URS set
              </Typography>
              <div className={classes.barWrap}>
                <LinearProgress
                  variant="determinate"
                  value={coveragePct}
                  color="primary"
                />
              </div>
            </div>

            {rows.length === 0 ? (
              <Typography color="textSecondary">
                No business capabilities found.
              </Typography>
            ) : (
              rows.map(row => (
                <div key={row.capability.id} className={classes.row}>
                  <div className={classes.rowHeader}>
                    <div>
                      <Typography variant="subtitle1">
                        {row.capability.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {row.capability.id} · {row.capability.domain}
                      </Typography>
                    </div>
                    <Chip
                      label={row.covered ? 'Covered' : 'Uncovered'}
                      size="small"
                      style={{
                        backgroundColor: row.covered
                          ? NEXORA_STATUS.success
                          : NEXORA_STATUS.pending,
                        color: NEXORA_STATUS.onAccent,
                        fontWeight: 600,
                      }}
                    />
                  </div>
                  {row.sets.length > 0 ? (
                    <div className={classes.setList}>
                      {row.sets.map(set => (
                        <Link
                          key={set.id}
                          to={`/urs-composer/${set.id}`}
                          onClick={e => {
                            e.preventDefault();
                            navigate(`/urs-composer/${set.id}`);
                          }}
                        >
                          {set.requirementSetId || set.solutionName || set.id}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No linked requirement sets
                    </Typography>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </Content>
    </Page>
  );
};
