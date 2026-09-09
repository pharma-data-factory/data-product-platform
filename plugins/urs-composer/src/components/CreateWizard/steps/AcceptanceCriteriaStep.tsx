import type { FC } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  IconButton,
  Chip,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import WarningIcon from '@material-ui/icons/Warning';
import { URSWizardState, AcceptanceCriteriaDraft } from '../wizardState';

function createTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const useStyles = makeStyles(theme => ({
  requirementSection: {
    marginBottom: theme.spacing(3),
  },
  requirementCard: {
    backgroundColor: theme.palette.background.default,
  },
  acContainer: {
    marginTop: theme.spacing(2),
    paddingLeft: theme.spacing(2),
    borderLeft: `3px solid ${theme.palette.primary.main}`,
  },
  acCard: {
    marginBottom: theme.spacing(1),
    backgroundColor: theme.palette.action.hover,
  },
  incompleteWarning: {
    marginBottom: theme.spacing(2),
  },
}));

interface AcceptanceCriteriaStepProps {
  state: URSWizardState;
  onStateChange: (updates: Partial<URSWizardState>) => void;
}

export const AcceptanceCriteriaStep: FC<AcceptanceCriteriaStepProps> = ({
  state,
  onStateChange,
}) => {
  const classes = useStyles();

  const handleAddCriteria = (reqIndex: number) => {
    const updated = [...state.requirements];
    if (!updated[reqIndex].acceptanceCriteria) {
      updated[reqIndex].acceptanceCriteria = [];
    }
    updated[reqIndex].acceptanceCriteria!.push({
      tempId: createTempId(),
      title: '',
    });
    onStateChange({ requirements: updated });
  };

  const handleUpdateCriteria = (
    reqIndex: number,
    acIndex: number,
    field: keyof AcceptanceCriteriaDraft,
    value: string,
  ) => {
    const updated = [...state.requirements];
    (updated[reqIndex].acceptanceCriteria![acIndex] as any)[field] = value;
    onStateChange({ requirements: updated });
  };

  const handleDeleteCriteria = (reqIndex: number, acIndex: number) => {
    const updated = [...state.requirements];
    updated[reqIndex].acceptanceCriteria = updated[reqIndex].acceptanceCriteria!.filter(
      (_, i) => i !== acIndex,
    );
    onStateChange({ requirements: updated });
  };

  const incompleteCount = state.requirements.filter(
    r => !r.acceptanceCriteria || r.acceptanceCriteria.length === 0,
  ).length;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        How will we know the requirement is satisfied?
      </Typography>
      <Typography color="textSecondary" paragraph>
        Define testable acceptance criteria for each requirement. Use the Given/When/Then pattern to
        structure verifiable conditions.
      </Typography>

      {incompleteCount > 0 && (
        <Alert severity="warning" className={classes.incompleteWarning} icon={<WarningIcon />}>
          <strong>{incompleteCount}</strong> requirement(s) don't have acceptance criteria yet.
        </Alert>
      )}

      {state.requirements.length === 0 ? (
        <Typography color="textSecondary">
          No requirements to add criteria to. Go back to the Requirements step.
        </Typography>
      ) : (
        state.requirements.map((req, reqIdx) => (
          <Box key={req.tempId} className={classes.requirementSection}>
            <Card variant="outlined" className={classes.requirementCard}>
              <CardContent>
                <Box display="flex" alignItems="center" style={{ gap: 8, marginBottom: 8 }}>
                  <Typography variant="subtitle2">
                    Requirement {reqIdx + 1}: {req.title || '(no title)'}
                  </Typography>
                  {(!req.acceptanceCriteria || req.acceptanceCriteria.length === 0) && (
                    <Chip label="No AC" size="small" color="secondary" />
                  )}
                </Box>

                <Typography variant="body2" color="textSecondary" paragraph>
                  {req.statement}
                </Typography>

                <Box className={classes.acContainer}>
                  <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                    <strong>Acceptance Criteria:</strong>
                  </Typography>

                  {!req.acceptanceCriteria || req.acceptanceCriteria.length === 0 ? (
                    <Typography variant="caption" color="textSecondary" display="block">
                      None defined yet.
                    </Typography>
                  ) : (
                    req.acceptanceCriteria.map((ac, acIdx) => (
                      <Card key={ac.tempId} className={classes.acCard}>
                        <CardContent style={{ padding: 12 }}>
                          <Box display="flex" alignItems="flex-start" style={{ gap: 8 }}>
                            <TextField
                              label={`AC-${acIdx + 1}`}
                              placeholder="Given [condition], When [event], Then [outcome]"
                              size="small"
                              fullWidth
                              multiline
                              rows={2}
                              value={ac.title}
                              onChange={e =>
                                handleUpdateCriteria(reqIdx, acIdx, 'title', e.target.value)
                              }
                              variant="outlined"
                            />
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteCriteria(reqIdx, acIdx)}
                              title="Delete criterion"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    ))
                  )}

                  <Button
                    startIcon={<AddIcon />}
                    size="small"
                    onClick={() => handleAddCriteria(reqIdx)}
                    style={{ marginTop: 8 }}
                  >
                    Add Criterion
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))
      )}

      <Box style={{ marginTop: 24 }}>
        <Typography variant="subtitle2" gutterBottom>
          Example Acceptance Criterion:
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          <strong>Given</strong> an authorized production user
          <br />
          <strong>When</strong> equipment state changes
          <br />
          <strong>Then</strong> the new state shall be displayed within 500ms
        </Typography>
      </Box>
    </Box>
  );
};
