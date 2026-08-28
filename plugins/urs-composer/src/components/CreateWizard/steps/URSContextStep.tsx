import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import InfoIcon from '@material-ui/icons/Info';
import { GxPRelevance } from '../../../api/types';
import { URSWizardState } from '../wizardState';

interface URSContextStepProps {
  state: URSWizardState;
  onStateChange: (updates: Partial<URSWizardState>) => void;
}

export const URSContextStep: React.FC<URSContextStepProps> = ({ state, onStateChange }) => {
  const handleContextChange = (field: string, value: any) => {
    onStateChange({
      context: {
        ...state.context,
        [field]: value,
      },
    });
  };

  const GxPDescription: Record<string, string> = {
    [GxPRelevance.DIRECT]:
      'Directly impacts data integrity, security, or patient safety. Subject to regulatory oversight.',
    [GxPRelevance.INDIRECT]:
      'Indirectly supports GxP-relevant systems but does not directly control data/processes.',
    [GxPRelevance.NONE]: 'No GxP impact. Not subject to regulatory requirements.',
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Define the scope and regulatory context
      </Typography>
      <Typography color="textSecondary" paragraph>
        Establish clear boundaries and classify regulatory requirements.
      </Typography>

      <Grid container spacing={2} style={{ marginTop: 8 }}>
        <Grid item xs={12}>
          <TextField
            label="URS Title"
            placeholder="e.g., Equipment OEE Monitoring"
            fullWidth
            value={state.context.title || ''}
            onChange={e => handleContextChange('title', e.target.value)}
            variant="outlined"
            required
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Scope"
            placeholder="What is included in this URS?"
            fullWidth
            multiline
            rows={2}
            value={state.context.scope || ''}
            onChange={e => handleContextChange('scope', e.target.value)}
            variant="outlined"
            required
            helperText="Clearly define what is IN scope for this requirement set"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Out of Scope"
            placeholder="What is explicitly NOT included?"
            fullWidth
            multiline
            rows={2}
            value={state.context.outOfScope || ''}
            onChange={e => handleContextChange('outOfScope', e.target.value)}
            variant="outlined"
            helperText="Identify important exclusions to avoid ambiguity"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Process Context"
            placeholder="Which manufacturing process or area? (e.g., Tablet Production, Fill-Finish)"
            fullWidth
            value={state.context.processContext || ''}
            onChange={e => handleContextChange('processContext', e.target.value)}
            variant="outlined"
          />
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth variant="outlined" required>
            <InputLabel>GxP Relevance</InputLabel>
            <Select
              value={state.context.gxpRelevance || ''}
              onChange={e => handleContextChange('gxpRelevance', e.target.value as string)}
              label="GxP Relevance"
            >
              <MenuItem value="">Select...</MenuItem>
              <MenuItem value={GxPRelevance.DIRECT}>GxP Relevant - Direct</MenuItem>
              <MenuItem value={GxPRelevance.INDIRECT}>GxP Relevant - Indirect</MenuItem>
              <MenuItem value={GxPRelevance.NONE}>Non-GxP</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {state.context.gxpRelevance && (
          <Grid item xs={12}>
            <Alert severity="info" icon={<InfoIcon />}>
              {GxPDescription[state.context.gxpRelevance]}
            </Alert>
          </Grid>
        )}

        {state.context.gxpRelevance === GxPRelevance.DIRECT && (
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              GxP Impact Classification:
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={state.context.patientImpact || false}
                  onChange={e => handleContextChange('patientImpact', e.target.checked)}
                />
              }
              label="Patient Impact (affects patient safety or efficacy)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={state.context.dataIntegrityImpact || false}
                  onChange={e => handleContextChange('dataIntegrityImpact', e.target.checked)}
                />
              }
              label="Data Integrity Impact (affects GMP records)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={state.context.electronicRecords || false}
                  onChange={e => handleContextChange('electronicRecords', e.target.checked)}
                />
              }
              label="Electronic Records / 21 CFR Part 11 Scope"
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};
