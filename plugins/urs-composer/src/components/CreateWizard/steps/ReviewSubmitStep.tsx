import type { FC } from 'react';
import { Box, Typography, Card, CardContent, Grid, Table, TableBody, TableCell, TableRow } from '@material-ui/core';
import { SolutionType } from '../../../api/types';
import { URSWizardState } from '../wizardState';

interface ReviewSubmitStepProps {
  state: URSWizardState;
  onStateChange: (updates: Partial<URSWizardState>) => void;
}

export const ReviewSubmitStep: FC<ReviewSubmitStepProps> = ({ state, onStateChange }) => {
  const handleChange = (field: string, value: string) => {
    onStateChange({
      solutionName: field === 'solutionName' ? value : state.solutionName,
      solutionType: field === 'solutionType' ? (value as SolutionType) : state.solutionType,
      solutionCatalogRef: field === 'catalogRef' ? value : state.solutionCatalogRef,
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review and save requirement set
      </Typography>
      <Typography color="textSecondary" paragraph>
        Final review before saving as draft. Create a baseline on the detail page to start the approval workflow.
      </Typography>

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
              <Typography variant="h6">
                {state.requirements.reduce((sum, r) => sum + (r.acceptanceCriteria?.length || 0), 0)}
              </Typography>
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
            Solution Context:
          </Typography>

          <Grid container spacing={2} style={{ marginTop: 8 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">
                Solution Type
              </Typography>
              <select
                value={state.solutionType || ''}
                onChange={e => handleChange('solutionType', e.target.value)}
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
              >
                <option value="">Select...</option>
                <option value={SolutionType.PROJECT}>Project</option>
                <option value={SolutionType.PLUGIN}>Plugin</option>
                <option value={SolutionType.COMPONENT}>Component</option>
                <option value={SolutionType.DATA_PRODUCT}>Data Product</option>
              </select>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">
                Solution Name
              </Typography>
              <input
                type="text"
                placeholder="e.g., Equipment OEE Dashboard"
                value={state.solutionName || ''}
                onChange={e => handleChange('solutionName', e.target.value)}
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body2" color="textSecondary">
                Catalog Reference (Optional)
              </Typography>
              <input
                type="text"
                placeholder="e.g., component:default/oee"
                value={state.solutionCatalogRef || ''}
                onChange={e => handleChange('catalogRef', e.target.value)}
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Ready to Save:
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
