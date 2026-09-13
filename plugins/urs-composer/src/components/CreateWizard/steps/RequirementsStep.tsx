import { useState, type FC } from 'react';
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
  Checkbox,
  CircularProgress,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import BuildIcon from '@material-ui/icons/Build';
import { Alert } from '@material-ui/lab';
import { useApi } from '@backstage/core-plugin-api';
import {
  RequirementPriority,
  GxPRelevance,
  COMPONENT_TYPES,
  REQUIREMENT_NATURES,
  CRITICALITIES,
  GeneratedRequirement,
} from '../../../api/types';
import { ursComposerApiRef } from '../../../api/ursComposerApi';
import { URSWizardState, RequirementDraft, AcceptanceCriteriaDraft } from '../wizardState';

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
  acContainer: {
    marginTop: theme.spacing(2),
    paddingLeft: theme.spacing(2),
    borderLeft: `3px solid ${theme.palette.primary.main}`,
  },
  acCard: {
    marginBottom: theme.spacing(1),
    backgroundColor: theme.palette.action.hover,
  },
  guidance: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.action.hover,
    borderLeft: `4px solid ${theme.palette.info.main}`,
  },
  aiSection: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    border: `1px dashed ${theme.palette.primary.main}`,
    borderRadius: theme.shape.borderRadius,
  },
  suggestionCard: {
    marginBottom: theme.spacing(1),
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  suggestionSelected: {
    borderColor: theme.palette.primary.main,
    borderWidth: 2,
    borderStyle: 'solid',
  },
}));

interface RequirementsStepProps {
  state: URSWizardState;
  onStateChange: (updates: Partial<URSWizardState>) => void;
}

function createTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const RequirementsStep: FC<RequirementsStepProps> = ({ state, onStateChange }) => {
  const classes = useStyles();
  const api = useApi(ursComposerApiRef);
  const [aiSuggestions, setAiSuggestions] = useState<GeneratedRequirement[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

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

  const handleUpdateClassification = (index: number, key: string, value: string) => {
    const updated = [...state.requirements];
    const req = updated[index] as any;
    req.classification = { ...(req.classification || {}), [key]: value };
    onStateChange({ requirements: updated });
  };

  const handleDeleteRequirement = (index: number) => {
    onStateChange({
      requirements: state.requirements.filter((_, i) => i !== index),
    });
  };

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

  const incompleteAcCount = state.requirements.filter(
    r => !r.acceptanceCriteria || r.acceptanceCriteria.length === 0,
  ).length;

  const handleGenerateSuggestions = async () => {
    if (!state.requirementSetId) {
      setAiError('Save the draft first before generating AI suggestions.');
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiSuggestions([]);
    setSelectedIndices(new Set());
    try {
      const suggestions = await api.generateRequirementSuggestions(state.requirementSetId);
      setAiSuggestions(suggestions);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Failed to generate suggestions');
    } finally {
      setAiLoading(false);
    }
  };

  const handleToggleSuggestion = (index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleAcceptSuggestions = () => {
    const newReqs: RequirementDraft[] = [];
    selectedIndices.forEach(idx => {
      const s = aiSuggestions[idx];
      newReqs.push({
        tempId: createTempId(),
        title: s.title,
        statement: s.statement,
        rationale: s.rationale,
        priority: s.priority as RequirementPriority,
        gxpRelevance: s.gxpRelevance as GxPRelevance,
        classification: s.classification as any,
        acceptanceCriteria: [],
      });
    });
    onStateChange({
      requirements: [...state.requirements, ...newReqs],
    });
    setAiSuggestions([]);
    setSelectedIndices(new Set());
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Define requirements & acceptance criteria
      </Typography>
      <Typography color="textSecondary" paragraph>
        Each requirement describes what the system shall do. Add verifiable acceptance criteria
        under each requirement (Given/When/Then). Requirements must be solution-agnostic.
      </Typography>

      {incompleteAcCount > 0 && state.requirements.length > 0 && (
        <Alert severity="warning" style={{ marginBottom: 16 }}>
          <strong>{incompleteAcCount}</strong> requirement(s) do not have acceptance criteria yet.
        </Alert>
      )}

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

                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Component Type</InputLabel>
                    <Select
                      value={req.classification?.componentType || ''}
                      onChange={e =>
                        handleUpdateClassification(idx, 'componentType', e.target.value as string)
                      }
                      label="Component Type"
                    >
                      <MenuItem value="">Select...</MenuItem>
                      {COMPONENT_TYPES.map(type => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Nature</InputLabel>
                    <Select
                      value={req.classification?.requirementNature || ''}
                      onChange={e =>
                        handleUpdateClassification(idx, 'requirementNature', e.target.value as string)
                      }
                      label="Nature"
                    >
                      <MenuItem value="">Select...</MenuItem>
                      {REQUIREMENT_NATURES.map(nature => (
                        <MenuItem key={nature} value={nature}>
                          {nature}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Criticality</InputLabel>
                    <Select
                      value={req.classification?.criticality || ''}
                      onChange={e =>
                        handleUpdateClassification(idx, 'criticality', e.target.value as string)
                      }
                      label="Criticality"
                    >
                      <MenuItem value="">Select...</MenuItem>
                      {CRITICALITIES.map(level => (
                        <MenuItem key={level} value={level}>
                          {level}
                        </MenuItem>
                      ))}
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

              <Box className={classes.acContainer}>
                <Typography variant="subtitle2" gutterBottom>
                  Acceptance Criteria
                </Typography>
                {!req.acceptanceCriteria || req.acceptanceCriteria.length === 0 ? (
                  <Typography variant="caption" color="textSecondary" display="block">
                    None defined yet. Add at least one criterion to continue.
                  </Typography>
                ) : (
                  req.acceptanceCriteria.map((ac, acIdx) => (
                    <Card key={ac.tempId} className={classes.acCard} variant="outlined">
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
                              handleUpdateCriteria(idx, acIdx, 'title', e.target.value)
                            }
                            variant="outlined"
                          />
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteCriteria(idx, acIdx)}
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
                  onClick={() => handleAddCriteria(idx)}
                  style={{ marginTop: 8 }}
                >
                  Add Criterion
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))
      )}

      {/* AI Suggestions Section */}
      <Box className={classes.aiSection}>
        <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Typography variant="subtitle2">
            AI Requirement Suggestions
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={aiLoading ? <CircularProgress size={16} /> : <BuildIcon />}
            onClick={handleGenerateSuggestions}
            disabled={aiLoading || !state.requirementSetId}
          >
            {aiLoading ? 'Generating...' : 'Generate Suggestions'}
          </Button>
        </Box>

        {!state.requirementSetId && (
          <Typography variant="body2" color="textSecondary">
            Save the draft first to enable AI suggestions.
          </Typography>
        )}

        {aiError && (
          <Alert severity="error" style={{ marginBottom: 8 }}>
            {aiError}
          </Alert>
        )}

        {aiSuggestions.length > 0 && (
          <Box>
            <Alert severity="info" style={{ marginBottom: 12 }}>
              AI-generated suggestions must be reviewed before acceptance. Select the ones you want to add.
            </Alert>
            {aiSuggestions.map((suggestion, idx) => (
              <Card
                key={idx}
                className={`${classes.suggestionCard} ${selectedIndices.has(idx) ? classes.suggestionSelected : ''}`}
                onClick={() => handleToggleSuggestion(idx)}
              >
                <CardContent style={{ padding: '8px 16px', paddingBottom: 8 }}>
                  <Box style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Checkbox
                      checked={selectedIndices.has(idx)}
                      color="primary"
                      style={{ padding: 4 }}
                    />
                    <Box style={{ flex: 1 }}>
                      <Typography variant="subtitle2">{suggestion.title}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {suggestion.statement}
                      </Typography>
                      <Box style={{ marginTop: 4, display: 'flex', gap: 8 }}>
                        <Typography variant="caption" color="primary">
                          {suggestion.priority}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {suggestion.classification?.componentType} / {suggestion.classification?.requirementNature}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          GxP: {suggestion.gxpRelevance}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={handleAcceptSuggestions}
              disabled={selectedIndices.size === 0}
              style={{ marginTop: 8 }}
            >
              Accept Selected ({selectedIndices.size})
            </Button>
          </Box>
        )}
      </Box>

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
