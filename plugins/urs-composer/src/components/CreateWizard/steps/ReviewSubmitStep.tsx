import type { FC } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { SolutionType } from '../../../api/types';
import { URSWizardState } from '../wizardState';

interface ReviewSubmitStepProps {
  state: URSWizardState;
  onStateChange: (updates: Partial<URSWizardState>) => void;
}

export const ReviewSubmitStep: FC<ReviewSubmitStepProps> = ({ state, onStateChange }) => {
  const acCount = state.requirements.reduce(
    (sum, r) => sum + (r.acceptanceCriteria?.length || 0),
    0,
  );
  const needDefined = !!state.businessNeed?.title;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review and save requirement set
      </Typography>
      <Typography color="textSecondary" paragraph>
        Final review before saving as draft. Create a baseline on the detail page to start the
        approval workflow.
      </Typography>

      <Alert severity="info" style={{ marginBottom: 16 }}>
        Approvals happen on the detail page after baseline. Electronic signature is a technical
        workflow control, not a GxP/Part 11 claim.
      </Alert>

      {/* Traceability summary (folded from former Traceability step) */}
      <Card style={{ marginBottom: 16 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Traceability summary
          </Typography>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>Business capabilities</TableCell>
                <TableCell align="right">{state.businessCapabilityRefs.length}</TableCell>
                <TableCell>{state.businessCapabilityRefs.length > 0 ? '✓' : '○'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Business need</TableCell>
                <TableCell align="right">{needDefined ? 'Defined' : '—'}</TableCell>
                <TableCell>{needDefined ? '✓' : '○'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Requirements</TableCell>
                <TableCell align="right">{state.requirements.length}</TableCell>
                <TableCell>{state.requirements.length > 0 ? '✓' : '○'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Acceptance criteria</TableCell>
                <TableCell align="right">{acCount}</TableCell>
                <TableCell>{acCount > 0 ? '✓' : '○'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={2} style={{ marginBottom: 24 }}>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Business Capabilities</Typography>
              <Typography variant="h6">{state.businessCapabilityRefs.length}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Requirements</Typography>
              <Typography variant="h6">{state.requirements.length}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Acceptance Criteria</Typography>
              <Typography variant="h6">{acCount}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">GxP Relevance</Typography>
              <Typography variant="h6">{state.context.gxpRelevance || 'Undetermined'}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Solution Type */}
      <Card style={{ marginBottom: 16 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Solution Context
          </Typography>

          <Grid container spacing={2} style={{ marginTop: 8 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel id="solution-type-label">Solution Type</InputLabel>
                <Select
                  labelId="solution-type-label"
                  label="Solution Type"
                  value={state.solutionType || ''}
                  onChange={e =>
                    onStateChange({ solutionType: e.target.value as SolutionType })
                  }
                >
                  <MenuItem value="">
                    <em>Select…</em>
                  </MenuItem>
                  <MenuItem value={SolutionType.PROJECT}>Project</MenuItem>
                  <MenuItem value={SolutionType.PLUGIN}>Plugin</MenuItem>
                  <MenuItem value={SolutionType.COMPONENT}>Component</MenuItem>
                  <MenuItem value={SolutionType.DATA_PRODUCT}>Data Product</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Solution Name"
                placeholder="e.g., Equipment OEE Dashboard"
                fullWidth
                variant="outlined"
                value={state.solutionName || ''}
                onChange={e => onStateChange({ solutionName: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Catalog Reference (Optional)"
                placeholder="e.g., component:default/oee"
                fullWidth
                variant="outlined"
                value={state.solutionCatalogRef || ''}
                onChange={e => onStateChange({ solutionCatalogRef: e.target.value })}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Ready to Save
          </Typography>

          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>{state.businessCapabilityRefs.length > 0 ? '✓' : '○'}</TableCell>
                <TableCell>Business capabilities selected</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{state.businessNeed?.title ? '✓' : '○'}</TableCell>
                <TableCell>Business need defined</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{state.context?.title ? '✓' : '○'}</TableCell>
                <TableCell>URS context defined</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{state.requirements.length > 0 ? '✓' : '○'}</TableCell>
                <TableCell>Requirements added</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  {state.requirements.every(
                    r => (r.acceptanceCriteria?.length || 0) > 0,
                  )
                    ? '✓'
                    : '○'}
                </TableCell>
                <TableCell>All requirements have acceptance criteria</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{state.solutionName ? '✓' : '○'}</TableCell>
                <TableCell>Solution name provided</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
};
