import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  IconButton,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import { RequirementPriority, GxPRelevance } from '../../../api/types';
import { URSWizardState, RequirementDraft } from '../wizardState';

const useStyles = makeStyles(theme => ({
  addButton: {
    marginTop: theme.spacing(2),
  },
  requirementCard: {
    marginBottom: theme.spacing(2),
    position: 'relative',
  },
  requirementHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  guidance: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.action.hover,
    borderLeft: `4px solid ${theme.palette.info.main}`,
  },
}));

interface RequirementsStepProps {
  state: URSWizardState;
  onStateChange: (updates: Partial<URSWizardState>) => void;
}

function createTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const RequirementsStep: React.FC<RequirementsStepProps> = ({ state, onStateChange }) => {
  const classes = useStyles();

  const handleAddRequirement = () => {
    const newReq: RequirementDraft = {
      tempId: createTempId(),
      title: '',
      statement: '',
      priority: RequirementPriority.MUST,
      acceptanceCriteria: [],
    };
    onStateChange({
      requirements: [...state.requirements, newReq],
    });
  };

  const handleUpdateRequirement = (index: number, field: keyof RequirementDraft, value: any) => {
    const updated = [...state.requirements];
    (updated[index] as any)[field] = value;
    onStateChange({ requirements: updated });
  };

  const handleDeleteRequirement = (index: number) => {
    onStateChange({
      requirements: state.requirements.filter((_, i) => i !== index),
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Define user requirements
      </Typography>
      <Typography color="textSecondary" paragraph>
        Each requirement describes what the system shall do. Requirements must be solution-agnostic
        and verifiable. Each requirement will link to acceptance criteria that define how to verify
        it is satisfied.
      </Typography>

      {state.requirements.length === 0 ? (
        <Typography color="textSecondary" style={{ marginTop: 16 }}>
          No requirements yet. Add your first requirement below.
        </Typography>
      ) : (
        state.requirements.map((req, idx) => (
          <Card key={req.tempId} className={classes.requirementCard}>
            <CardContent>
              <div className={classes.requirementHeader}>
                <Typography variant="subtitle2">
                  Requirement {idx + 1}
                  {req.id && ` (${req.id})`}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteRequirement(idx)}
                  title="Delete requirement"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </div>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Title"
                    placeholder="Short descriptive title"
                    fullWidth
                    value={req.title || ''}
                    onChange={e => handleUpdateRequirement(idx, 'title', e.target.value)}
                    variant="outlined"
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Requirement Statement"
                    placeholder="The system shall..."
                    fullWidth
                    multiline
                    rows={3}
                    value={req.statement}
                    onChange={e => handleUpdateRequirement(idx, 'statement', e.target.value)}
                    variant="outlined"
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Rationale"
                    placeholder="Why is this requirement needed?"
                    fullWidth
                    multiline
                    rows={2}
                    value={req.rationale || ''}
                    onChange={e => handleUpdateRequirement(idx, 'rationale', e.target.value)}
                    variant="outlined"
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={req.priority || RequirementPriority.MUST}
                      onChange={e => handleUpdateRequirement(idx, 'priority', e.target.value)}
                      label="Priority"
                    >
                      <MenuItem value={RequirementPriority.MUST}>Must Have</MenuItem>
                      <MenuItem value={RequirementPriority.SHOULD}>Should Have</MenuItem>
                      <MenuItem value={RequirementPriority.COULD}>Could Have</MenuItem>
                      <MenuItem value={RequirementPriority.WONT}>Won't Have</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={req.category || ''}
                      onChange={e => handleUpdateRequirement(idx, 'category', e.target.value)}
                      label="Category"
                    >
                      <MenuItem value="">Select...</MenuItem>
                      <MenuItem value="Functional">Functional</MenuItem>
                      <MenuItem value="NonFunctional">Non-Functional</MenuItem>
                      <MenuItem value="Regulatory">Regulatory</MenuItem>
                      <MenuItem value="Interface">Interface</MenuItem>
                      <MenuItem value="Performance">Performance</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>GxP</InputLabel>
                    <Select
                      value={req.gxpRelevance || ''}
                      onChange={e => handleUpdateRequirement(idx, 'gxpRelevance', e.target.value)}
                      label="GxP"
                    >
                      <MenuItem value="">Not Set</MenuItem>
                      <MenuItem value={GxPRelevance.DIRECT}>Direct</MenuItem>
                      <MenuItem value={GxPRelevance.INDIRECT}>Indirect</MenuItem>
                      <MenuItem value={GxPRelevance.NONE}>None</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Source / Reference"
                    placeholder="e.g., Customer request, Regulation 21 CFR 11"
                    fullWidth
                    value={req.source || ''}
                    onChange={e => handleUpdateRequirement(idx, 'source', e.target.value)}
                    variant="outlined"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))
      )}

      <Button
        startIcon={<AddIcon />}
        onClick={handleAddRequirement}
        className={classes.addButton}
        variant="outlined"
      >
        Add Requirement
      </Button>

      <Box className={classes.guidance}>
        <Typography variant="subtitle2" gutterBottom>
          ✓ Requirement Writing Guidance
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>GOOD:</strong> The system shall display the current equipment operating state to
          authorized production users.
        </Typography>
        <Typography variant="body2">
          <strong>AVOID:</strong> Install a React dashboard and connect it to MQTT. (This is
          solution design, not requirements.)
        </Typography>
      </Box>
    </Box>
  );
};
