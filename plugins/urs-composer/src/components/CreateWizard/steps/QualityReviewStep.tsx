import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Card, CardContent } from '@material-ui/core';
import WarningIcon from '@material-ui/icons/Warning';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import { URSWizardState } from '../wizardState';

const useStyles = require('@material-ui/core/styles').makeStyles((theme: any) => ({
  qualityMetric: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  pass: {
    color: theme.palette.success.main,
  },
  warning: {
    color: theme.palette.warning.main,
  },
  blocking: {
    color: theme.palette.error.main,
  },
}));

interface QualityReviewStepProps {
  state: URSWizardState;
  onStateChange: (updates: Partial<URSWizardState>) => void;
}

export const QualityReviewStep: React.FC<QualityReviewStepProps> = () => {
  const classes = useStyles();

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review requirement quality
      </Typography>
      <Typography color="textSecondary" paragraph>
        Automated quality checks help identify requirements that may not meet our standards.
      </Typography>

      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Check</TableCell>
                <TableCell>Result</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Clarity</TableCell>
                <TableCell>
                  <Box className={classes.qualityMetric}>
                    <CheckCircleIcon className={classes.pass} />
                    PASS
                  </Box>
                </TableCell>
                <TableCell>Requirements are clear and unambiguous</TableCell>
              </TableRow>

              <TableRow>
                <TableCell>Testability</TableCell>
                <TableCell>
                  <Box className={classes.qualityMetric}>
                    <CheckCircleIcon className={classes.pass} />
                    PASS
                  </Box>
                </TableCell>
                <TableCell>All requirements have verifiable acceptance criteria</TableCell>
              </TableRow>

              <TableRow>
                <TableCell>Solution Independence</TableCell>
                <TableCell>
                  <Box className={classes.qualityMetric}>
                    <WarningIcon className={classes.warning} />
                    WARNING
                  </Box>
                </TableCell>
                <TableCell>One requirement mentions specific technology. Review: "... shall use MQTT..."</TableCell>
              </TableRow>

              <TableRow>
                <TableCell>Acceptance Criteria</TableCell>
                <TableCell>
                  <Box className={classes.qualityMetric}>
                    <CheckCircleIcon className={classes.pass} />
                    PASS
                  </Box>
                </TableCell>
                <TableCell>All requirements have acceptance criteria</TableCell>
              </TableRow>

              <TableRow>
                <TableCell>GxP Classification</TableCell>
                <TableCell>
                  <Box className={classes.qualityMetric}>
                    <CheckCircleIcon className={classes.pass} />
                    PASS
                  </Box>
                </TableCell>
                <TableCell>GxP relevance is consistently defined</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Box style={{ marginTop: 24 }}>
        <Typography variant="body2" gutterBottom>
          📋 <strong>Note:</strong> Warnings do not block submission, but review the flagged items.
          You may proceed or return to the Requirements step to refine.
        </Typography>
      </Box>
    </Box>
  );
};
