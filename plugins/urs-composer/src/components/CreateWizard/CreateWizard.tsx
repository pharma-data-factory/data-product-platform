/**
 * URS Create Wizard (8-Step)
 */

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type FC,
  type ChangeEvent,
} from 'react';
import { useApi } from '@backstage/core-plugin-api';
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { makeStyles } from '@material-ui/core/styles';
import SaveIcon from '@material-ui/icons/Save';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import { Header, Page, Content } from '@backstage/core-components';

import {
  URSWizardState,
  initializeWizardState,
  validateStep,
  markDirty,
  markSaved,
  toCreateRequirementSetRequest,
  toDraftRequirementsPayload,
  fromImportJson,
} from './wizardState';
import { BusinessCapabilityStep } from './steps/BusinessCapabilityStep';
import { BusinessNeedStep } from './steps/BusinessNeedStep';
import { URSContextStep } from './steps/URSContextStep';
import { RequirementsStep } from './steps/RequirementsStep';
import { AcceptanceCriteriaStep } from './steps/AcceptanceCriteriaStep';
import { QualityReviewStep } from './steps/QualityReviewStep';
import { TraceabilityStep } from './steps/TraceabilityStep';
import { ReviewSubmitStep } from './steps/ReviewSubmitStep';
import { ursComposerApiRef } from '../../api/ursComposerApi';
import type { BusinessCapability } from '../../api/types';
import { URSStatus } from '../../api/types';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(3),
  },
  stepper: {
    backgroundColor: theme.palette.background.paper,
    marginBottom: theme.spacing(3),
  },
  stepperContainer: {
    marginBottom: theme.spacing(4),
  },
  stepContent: {
    minHeight: '400px',
  },
  actions: {
    display: 'flex',
    gap: theme.spacing(2),
    marginTop: theme.spacing(3),
    justifyContent: 'space-between',
  },
  errorAlert: {
    marginBottom: theme.spacing(2),
  },
  draftIndicator: {
    marginBottom: theme.spacing(2),
  },
  capabilityBar: {
    display: 'flex',
    gap: theme.spacing(0.5),
    padding: theme.spacing(0, 0, 0.5, 0),
    flexWrap: 'wrap',
    alignItems: 'center',
  },
}));

const STEPS = [
  'Business Capability',
  'Business Need',
  'URS Context',
  'Requirements',
  'Acceptance Criteria',
  'Quality & GxP Review',
  'Traceability',
  'Review & Save',
];

interface CreateWizardProps {
  initialState?: URSWizardState;
  editMode?: boolean;
  onComplete?: (requirementSetId: string) => void;
  onCancel?: () => void;
}

export const CreateWizard: FC<CreateWizardProps> = ({
  initialState,
  editMode = false,
  onComplete,
  onCancel,
}) => {
  const classes = useStyles();
  const api = useApi(ursComposerApiRef);
  const [state, setState] = useState<URSWizardState>(
    initialState || initializeWizardState(),
  );
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [capabilityNames, setCapabilityNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!state.dirty) {
      return undefined;
    }
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.dirty]);

  useEffect(() => {
    if (state.businessCapabilityRefs.length === 0) {
      setCapabilityNames(new Map());
      return undefined;
    }
    let cancelled = false;
    api.listCapabilities().then(result => {
      if (cancelled) return;
      const caps: BusinessCapability[] = Array.isArray(result) ? result : (result as any).items ?? [];
      const map = new Map<string, string>();
      for (const cap of caps) {
        if (state.businessCapabilityRefs.includes(cap.id)) {
          map.set(cap.id, cap.name);
        }
      }
      setCapabilityNames(map);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [state.businessCapabilityRefs, api]);

  const persistDraft = useCallback(async () => {
    const base = toCreateRequirementSetRequest(state);
    const requirements = toDraftRequirementsPayload(state);
    const updatePayload = { ...base, requirements };

    if (state.requirementSetId) {
      return api.updateRequirementSet(
        state.requirementSetId,
        updatePayload,
      );
    }

    const created = await api.createRequirementSet(base);
    if (requirements.length > 0) {
      return api.updateRequirementSet(created.id, updatePayload);
    }
    return { requirementSet: created, requirements: [] };
  }, [state, api]);

  const handleNext = useCallback(() => {
    const validation = validateStep(state, state.currentStep);
    if (!validation.isValid) {
      setStepErrors(validation.errors);
      return;
    }
    setStepErrors([]);
    setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
  }, [state]);

  const handleBack = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }));
    setStepErrors([]);
  }, []);

  const handleStateChange = useCallback((updates: Partial<URSWizardState>) => {
    setState(prev => markDirty({ ...prev, ...updates }));
    setSaveError(null);
  }, []);

  const handleSaveDraft = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const result = await persistDraft();
      setState(prev => markSaved(prev, result.requirementSet.id));
      const now = new Date();
      setSaveSuccess(`Draft saved at ${now.toLocaleTimeString()}`);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (error) {
      const apiError = error as any;
      setSaveError(apiError.message || 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  }, [persistDraft]);

  const handleSubmit = useCallback(async () => {
    const validation = validateStep(state, state.currentStep);
    if (!validation.isValid) {
      setStepErrors(validation.errors);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const saved = await persistDraft();
      onComplete?.(saved.requirementSet.id);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save URS');
    } finally {
      setIsSaving(false);
    }
  }, [state, onComplete, persistDraft]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportJson = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const result = fromImportJson(json);
        if (result.valid && result.state) {
          setState(result.state);
          setStepErrors([]);
          setSaveError(null);
          setSaveSuccess(`Imported ${result.state.requirements.length} requirement(s) from ${file.name}`);
          setTimeout(() => setSaveSuccess(null), 4000);
        } else {
          setStepErrors(result.errors);
        }
      } catch {
        setStepErrors(['Failed to parse JSON file. Check the file format.']);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const renderStepContent = () => {
    const props = { state, onStateChange: handleStateChange };
    switch (state.currentStep) {
      case 0:
        return <BusinessCapabilityStep {...props} />;
      case 1:
        return <BusinessNeedStep {...props} />;
      case 2:
        return <URSContextStep {...props} />;
      case 3:
        return <RequirementsStep {...props} />;
      case 4:
        return <AcceptanceCriteriaStep {...props} />;
      case 5:
        return <QualityReviewStep {...props} />;
      case 6:
        return <TraceabilityStep {...props} />;
      case 7:
        return <ReviewSubmitStep {...props} />;
      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  const isLastStep = state.currentStep === STEPS.length - 1;
  const canContinue = validateStep(state, state.currentStep).isValid;

  return (
    <Page themeId="tool">
      <Header
        title={editMode ? 'Edit URS Draft' : 'Create URS'}
        subtitle="8-Step Guided Wizard"
      />
      <Content>
        {(capabilityNames.size > 0 && state.currentStep > 0) || state.ursStatus ? (
          <Box className={classes.capabilityBar}>
            {capabilityNames.size > 0 && state.currentStep > 0 && (
              <>
                <Typography variant="caption" color="textSecondary">
                  Business Capability:
                </Typography>
                {Array.from(capabilityNames.values()).map(name => (
                  <Chip key={name} label={name} size="small" color="primary" variant="outlined" />
                ))}
              </>
            )}
            {state.ursStatus && (
              <>
                <Chip
                  label={`v${state.versionNumber ?? 1}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={state.ursStatus}
                  size="small"
                  color={
                    state.ursStatus === URSStatus.APPROVED || state.ursStatus === URSStatus.BASELINED
                      ? 'primary'
                      : 'default'
                  }
                />
              </>
            )}
          </Box>
        ) : null}
        <Box className={classes.root}>
          {state.dirty && (
            <Alert severity="info" className={classes.draftIndicator}>
              You have unsaved changes. Use "Save Draft" to persist your progress.
            </Alert>
          )}

          {saveSuccess && (
            <Alert severity="success" className={classes.errorAlert}>
              {saveSuccess}
            </Alert>
          )}

          {saveError && (
            <Alert severity="error" className={classes.errorAlert}>
              {saveError}
            </Alert>
          )}

          <Box className={classes.stepperContainer}>
            <Stepper activeStep={state.currentStep} className={classes.stepper}>
              {STEPS.map((label, idx) => (
                <Step key={idx}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {stepErrors.length > 0 && (
            <Alert severity="error" className={classes.errorAlert}>
              <Typography variant="body2" component="div">
                <strong>Cannot proceed to next step:</strong>
              </Typography>
              <ul>
                {stepErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </Alert>
          )}

          <Card>
            <CardContent className={classes.stepContent}>
              {isSaving ? (
                <Box display="flex" alignItems="center" justifyContent="center" minHeight="300px">
                  <CircularProgress />
                </Box>
              ) : (
                renderStepContent()
              )}
            </CardContent>
          </Card>

          <input
            type="file"
            accept=".json,application/json"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileSelected}
          />

          <Box className={classes.actions}>
            <Box>
              {state.currentStep > 0 && (
                <Button startIcon={<ArrowBackIcon />} onClick={handleBack} disabled={isSaving}>
                  Back
                </Button>
              )}
              <Button
                startIcon={<CloudUploadIcon />}
                onClick={handleImportJson}
                disabled={isSaving}
              >
                Import JSON
              </Button>
            </Box>

            <Box display="flex" style={{ gap: 8 }}>
              {!isLastStep && (
                <>
                  <Button
                    startIcon={<SaveIcon />}
                    onClick={handleSaveDraft}
                    disabled={!state.dirty || isSaving}
                  >
                    Save Draft
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleNext}
                    disabled={!canContinue || isSaving}
                  >
                    Continue
                  </Button>
                </>
              )}

              {isLastStep && (
                <>
                  <Button onClick={onCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button
                    startIcon={<SaveIcon />}
                    onClick={handleSaveDraft}
                    disabled={!state.dirty || isSaving}
                  >
                    Save Draft
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                    disabled={isSaving || !canContinue}
                  >
                    Save Draft
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Box>
      </Content>
    </Page>
  );
};
