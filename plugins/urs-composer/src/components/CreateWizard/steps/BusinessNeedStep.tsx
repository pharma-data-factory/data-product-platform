/**
 * STEP 2: Business Need
 * (Shell - Structured form for business context)
 */

import React from 'react';
import { Box, Typography, TextField, Grid } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { URSWizardState } from '../wizardState';

interface BusinessNeedStepProps {
  state: URSWizardState;
  onStateChange: (updates: Partial<URSWizardState>) => void;
}

export const BusinessNeedStep: React.FC<BusinessNeedStepProps> = ({ state, onStateChange }) => {
  const handleChange = (field: string, value: any) => {
    onStateChange({
      businessNeed: {
        ...state.businessNeed,
        [field]: value,
      },
    });
  };

  const handleStakeholdersChange = (value: string) => {
    const stakeholders = value
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    handleChange('stakeholders', stakeholders);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        What business problem are we solving?
      </Typography>
      <Typography color="textSecondary" paragraph>
        Capture structured business context. Avoid specifying the technical solution.
      </Typography>

      <Alert severity="info" style={{ marginBottom: 16 }}>
        💡 <strong>Guidance:</strong> Describe what users cannot do today or what improvement is
        needed. Focus on the business outcome, not the technical implementation.
      </Alert>

      <Grid container spacing={2} style={{ marginTop: 8 }}>
        <Grid item xs={12}>
          <TextField
            label="Business Need Title"
            placeholder="e.g., Operators need real-time equipment visibility"
            fullWidth
            multiline
            rows={2}
            value={state.businessNeed.title || ''}
            onChange={e => handleChange('title', e.target.value)}
            variant="outlined"
            required
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
            <strong>Good:</strong> Operators require visibility of equipment performance.
          </Typography>
          <Typography variant="caption" color="textSecondary" display="block">
            <strong>Avoid:</strong> Install a React dashboard connected to MQTT.
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Desired Outcome"
            placeholder="What should be possible after this is implemented?"
            fullWidth
            multiline
            rows={3}
            value={state.businessNeed.desiredOutcome || ''}
            onChange={e => handleChange('desiredOutcome', e.target.value)}
            variant="outlined"
            required
            helperText="What is the business benefit or outcome we are pursuing?"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Business Value"
            placeholder="e.g., Risk reduction, cost savings, compliance, quality improvement"
            fullWidth
            multiline
            rows={2}
            value={state.businessNeed.businessValue || ''}
            onChange={e => handleChange('businessValue', e.target.value)}
            variant="outlined"
            helperText="What business benefits will this deliver?"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Stakeholders"
            placeholder="e.g., Production Operators, Quality Manager, Engineering Lead"
            fullWidth
            value={state.businessNeed.stakeholders?.join(', ') || ''}
            onChange={e => handleStakeholdersChange(e.target.value)}
            variant="outlined"
            helperText="Comma-separated list of key stakeholders"
          />
        </Grid>
      </Grid>
    </Box>
  );
};
