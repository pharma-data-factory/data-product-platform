/**
 * STEP 1: Business Capability
 * 
 * Select one or more business capabilities that anchor the requirements.
 * Loads real capabilities from URS API.
 */

import React, { useState, useEffect } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import {
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  TextField,
  Grid,
  Chip,
  FormControlLabel,
  Checkbox,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { makeStyles } from '@material-ui/core/styles';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import { BusinessCapability, URSApiError } from '../../../api/types';
import { ursComposerApiRef } from '../../../api/ursComposerApi';
import { URSWizardState } from '../wizardState';

const useStyles = makeStyles(theme => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3),
  },
  intro: {
    marginBottom: theme.spacing(2),
  },
  searchBox: {
    marginBottom: theme.spacing(2),
  },
  capabilityCard: {
    height: '100%',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      boxShadow: theme.shadows[4],
    },
  },
  capabilityCardSelected: {
    border: `2px solid ${theme.palette.primary.main}`,
    backgroundColor: theme.palette.action.hover,
  },
  selectedIndicator: {
    color: theme.palette.primary.main,
    marginRight: theme.spacing(1),
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: theme.spacing(4),
  },
  selectedChips: {
    marginTop: theme.spacing(2),
    display: 'flex',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
  },
  domain: {
    display: 'inline-block',
    marginTop: theme.spacing(1),
    padding: theme.spacing(0.5, 1),
    backgroundColor: theme.palette.grey[200],
    borderRadius: theme.spacing(0.5),
    fontSize: '0.75rem',
  },
}));

interface BusinessCapabilityStepProps {
  state: URSWizardState;
  onStateChange: (updates: Partial<URSWizardState>) => void;
}

export const BusinessCapabilityStep: React.FC<BusinessCapabilityStepProps> = ({
  state,
  onStateChange,
}) => {
  const classes = useStyles();
  const api = useApi(ursComposerApiRef);
  const [capabilities, setCapabilities] = useState<BusinessCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Load capabilities on mount
  useEffect(() => {
    const loadCapabilities = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.listCapabilities();
        setCapabilities(data);
      } catch (err) {
        const apiError = err as URSApiError;
        setError(`Failed to load capabilities: ${apiError.message}`);
      } finally {
        setLoading(false);
      }
    };
    loadCapabilities();
  }, [api]);

  const handleToggleCapability = (capabilityId: string) => {
    const newRefs = state.businessCapabilityRefs.includes(capabilityId)
      ? state.businessCapabilityRefs.filter(id => id !== capabilityId)
      : [...state.businessCapabilityRefs, capabilityId];

    onStateChange({ businessCapabilityRefs: newRefs });
  };

  // Filter capabilities by search term
  const filteredCapabilities = capabilities.filter(cap =>
    cap.name.toLowerCase().includes(search.toLowerCase()) ||
    cap.description.toLowerCase().includes(search.toLowerCase()),
  );

  // Get selected capability objects for display
  const selectedCapabilities = capabilities.filter(cap =>
    state.businessCapabilityRefs.includes(cap.id),
  );

  if (loading) {
    return (
      <Box className={classes.loadingContainer}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className={classes.container}>
      {/* Intro */}
      <Box className={classes.intro}>
        <Typography variant="h6" gutterBottom>
          What business capability does this URS support?
        </Typography>
        <Typography color="textSecondary" paragraph>
          Business capabilities anchor requirements to the business outcome rather than to a
          specific application or technology.
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Select one or more capabilities that are relevant to this URS.
        </Typography>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error">{error}</Alert>
      )}

      {/* Search */}
      <TextField
        className={classes.searchBox}
        placeholder="Search capabilities..."
        variant="outlined"
        size="small"
        value={search}
        onChange={e => setSearch(e.target.value)}
        fullWidth
      />

      {/* Selected Chips */}
      {selectedCapabilities.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Selected Capabilities:
          </Typography>
          <Box className={classes.selectedChips}>
            {selectedCapabilities.map(cap => (
              <Chip
                key={cap.id}
                label={cap.name}
                onDelete={() => handleToggleCapability(cap.id)}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Capability Cards Grid */}
      <Grid container spacing={2}>
        {filteredCapabilities.length === 0 ? (
          <Grid item xs={12}>
            <Alert severity="info">
              {search ? 'No capabilities match your search.' : 'No capabilities available.'}
            </Alert>
          </Grid>
        ) : (
          filteredCapabilities.map(cap => {
            const isSelected = state.businessCapabilityRefs.includes(cap.id);
            return (
              <Grid item xs={12} sm={6} md={4} key={cap.id}>
                <Card
                  className={`${classes.capabilityCard} ${
                    isSelected ? classes.capabilityCardSelected : ''
                  }`}
                  onClick={() => handleToggleCapability(cap.id)}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      {isSelected && (
                        <CheckCircleIcon className={classes.selectedIndicator} />
                      )}
                      <Typography variant="h6">{cap.name}</Typography>
                    </Box>
                    <Typography color="textSecondary" style={{ marginTop: 8 }}>
                      {cap.description}
                    </Typography>
                    <div className={classes.domain}>{cap.domain}</div>
                  </CardContent>
                  <CardActions>
                    <FormControlLabel
                      control={<Checkbox checked={isSelected} readOnly />}
                      label={isSelected ? 'Selected' : 'Select'}
                      onClick={e => e.stopPropagation()}
                    />
                  </CardActions>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>

      {/* Guidance */}
      <Box style={{ marginTop: 24 }}>
        <Typography variant="caption" color="textSecondary" component="div">
          💡 <strong>Guidance:</strong> Select the business capabilities that this URS directly
          supports or enables. If unsure, consult your business stakeholders or solution
          architecture team.
        </Typography>
      </Box>
    </Box>
  );
};
