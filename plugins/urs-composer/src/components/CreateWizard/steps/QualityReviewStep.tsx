import { useEffect, useState, type FC } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Card,
  CardContent,
  CircularProgress,
  Chip,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { makeStyles } from '@material-ui/core/styles';
import WarningIcon from '@material-ui/icons/Warning';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import { useApi } from '@backstage/core-plugin-api';
import { ursComposerApiRef } from '../../../api/ursComposerApi';
import type { QualityCheckResult } from '../../../api/types';
import { URSWizardState } from '../wizardState';

const useStyles = makeStyles(theme => ({
  qualityMetric: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  pass: {
    color: theme.palette.success.main,
  },
  warning: {
    color: theme.palette.warning.main,
  },
  error: {
    color: theme.palette.error.main,
  },
  loadingBox: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    gap: theme.spacing(2),
  },
  summaryChips: {
    display: 'flex',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
    marginBottom: theme.spacing(2),
  },
  disclaimer: {
    marginBottom: theme.spacing(2),
  },
}));

type CheckSeverity = 'PASS' | 'WARNING' | 'ERROR' | 'INFO';

interface DisplayIssue {
  check: string;
  severity: CheckSeverity;
  notes: string;
  recommendation?: string;
  source: 'api' | 'local';
}

interface QualityReviewStepProps {
  state: URSWizardState;
  onStateChange: (updates: Partial<URSWizardState>) => void;
}

function buildLocalIssues(state: URSWizardState): DisplayIssue[] {
  const issues: DisplayIssue[] = [];

  state.requirements.forEach((req, idx) => {
    const label = req.title?.trim() || `Requirement ${idx + 1}`;

    if (!req.statement?.trim()) {
      issues.push({
        check: label,
        severity: 'ERROR',
        notes: 'Empty requirement statement',
        source: 'local',
      });
    }

    if (!req.gxpRelevance) {
      issues.push({
        check: label,
        severity: 'WARNING',
        notes: 'GxP relevance is not set',
        source: 'local',
      });
    }

    if (!req.acceptanceCriteria || req.acceptanceCriteria.length === 0) {
      issues.push({
        check: label,
        severity: 'WARNING',
        notes: 'Missing acceptance criteria',
        source: 'local',
      });
    } else {
      const emptyAc = req.acceptanceCriteria.filter(ac => !ac.title?.trim());
      if (emptyAc.length > 0) {
        issues.push({
          check: label,
          severity: 'WARNING',
          notes: `${emptyAc.length} acceptance criterion(a) have empty titles`,
          source: 'local',
        });
      }
    }
  });

  if (state.requirements.length === 0) {
    issues.push({
      check: 'Requirements',
      severity: 'ERROR',
      notes: 'No requirements defined',
      source: 'local',
    });
  }

  return issues;
}

function mapApiIssues(apiIssues: QualityCheckResult[]): DisplayIssue[] {
  return apiIssues.map(issue => ({
    check: issue.requirementId || 'Requirement',
    severity: (issue.severity as CheckSeverity) || 'WARNING',
    notes: issue.issue,
    recommendation: issue.recommendation,
    source: 'api' as const,
  }));
}

function SeverityIcon({ severity, classes }: { severity: CheckSeverity; classes: ReturnType<typeof useStyles> }) {
  if (severity === 'ERROR') {
    return <ErrorIcon className={classes.error} fontSize="small" />;
  }
  if (severity === 'WARNING' || severity === 'INFO') {
    return <WarningIcon className={classes.warning} fontSize="small" />;
  }
  return <CheckCircleIcon className={classes.pass} fontSize="small" />;
}

export const QualityReviewStep: FC<QualityReviewStepProps> = ({ state }) => {
  const classes = useStyles();
  const api = useApi(ursComposerApiRef);
  const [apiIssues, setApiIssues] = useState<DisplayIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const runApiChecks = async () => {
      setLoading(true);
      setError(null);
      try {
        let issues: QualityCheckResult[] = [];

        if (state.requirementSetId) {
          const result = await api.validateRequirementSet(state.requirementSetId);
          issues = result.issues ?? [];
        } else if (state.requirements.length > 0) {
          const results = await Promise.all(
            state.requirements.map(req =>
              api.validateRequirement({
                title: req.title,
                statement: req.statement,
                gxpRelevance: req.gxpRelevance,
              }),
            ),
          );
          issues = results.flatMap(r => r.issues ?? []);
        }

        if (!cancelled) {
          setApiIssues(mapApiIssues(issues));
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : (err as { message?: string })?.message || 'Quality check API failed';
          setError(message);
          setApiIssues([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    runApiChecks();
    return () => {
      cancelled = true;
    };
  }, [api, state.requirementSetId, state.requirements]);

  const localIssues = buildLocalIssues(state);
  const allIssues = [...apiIssues, ...localIssues];
  const errorCount = allIssues.filter(i => i.severity === 'ERROR').length;
  const warningCount = allIssues.filter(
    i => i.severity === 'WARNING' || i.severity === 'INFO',
  ).length;
  const overallPass = !loading && !error && allIssues.length === 0;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Quality review
      </Typography>
      <Typography color="textSecondary" paragraph>
        Review automated checks against the current requirements and acceptance criteria.
      </Typography>

      <Alert severity="info" className={classes.disclaimer}>
        Automated quality checks (technical). Not a validated CSV gate.
      </Alert>

      {loading && (
        <Box className={classes.loadingBox}>
          <CircularProgress size={28} />
          <Typography color="textSecondary">Running quality checks…</Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" style={{ marginBottom: 16 }}>
          Could not reach the quality check API: {error}. Local checks below still apply.
        </Alert>
      )}

      {!loading && (
        <>
          <Box className={classes.summaryChips}>
            {overallPass ? (
              <Chip
                icon={<CheckCircleIcon />}
                label="PASS — no issues found"
                color="primary"
                variant="outlined"
              />
            ) : (
              <>
                {errorCount > 0 && (
                  <Chip
                    icon={<ErrorIcon />}
                    label={`${errorCount} ERROR`}
                    color="secondary"
                  />
                )}
                {warningCount > 0 && (
                  <Chip
                    icon={<WarningIcon />}
                    label={`${warningCount} WARNING`}
                    variant="outlined"
                  />
                )}
              </>
            )}
          </Box>

          <Card>
            <CardContent>
              {overallPass ? (
                <Box className={classes.qualityMetric}>
                  <CheckCircleIcon className={classes.pass} />
                  <Typography>
                    All automated and local checks passed. You may continue to Review & Save.
                  </Typography>
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Check</TableCell>
                      <TableCell>Result</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell>Source</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allIssues.map((issue, idx) => (
                      <TableRow key={`${issue.check}-${idx}`}>
                        <TableCell>{issue.check}</TableCell>
                        <TableCell>
                          <Box className={classes.qualityMetric}>
                            <SeverityIcon severity={issue.severity} classes={classes} />
                            {issue.severity}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {issue.notes}
                          {issue.recommendation && (
                            <Typography variant="caption" display="block" color="textSecondary">
                              {issue.recommendation}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={issue.source === 'api' ? 'API' : 'Local'}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Box style={{ marginTop: 24 }}>
            <Typography variant="body2" color="textSecondary">
              Warnings and errors do not block saving a draft. Review flagged items before
              continuing; return to Requirements & Acceptance Criteria to refine.
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};
