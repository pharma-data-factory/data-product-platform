import type { FC } from 'react';
import { Box, Typography, Card, CardContent, Table, TableBody, TableCell, TableHead, TableRow } from '@material-ui/core';
import { URSWizardState } from '../wizardState';

interface TraceabilityStepProps {
  state: URSWizardState;
  onStateChange: (updates: Partial<URSWizardState>) => void;
}

export const TraceabilityStep: FC<TraceabilityStepProps> = ({ state }) => {
  const capabilityCount = state.businessCapabilityRefs.length;
  const needDefined = !!state.businessNeed?.title;
  const requirementCount = state.requirements.length;
  const acCount = state.requirements.reduce((sum, r) => sum + (r.acceptanceCriteria?.length || 0), 0);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review traceability
      </Typography>
      <Typography color="textSecondary" paragraph>
        Ensure all requirements are traceable through the complete chain from business capability
        to acceptance criteria.
      </Typography>

      <Card style={{ marginBottom: 16 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Traceability Chain:
          </Typography>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Level</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Business Capability</TableCell>
                <TableCell>{capabilityCount}</TableCell>
                <TableCell>{capabilityCount > 0 ? '✓' : '○'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Business Need</TableCell>
                <TableCell>{needDefined ? 'Defined' : 'Not defined'}</TableCell>
                <TableCell>{needDefined ? '✓' : '○'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Requirements</TableCell>
                <TableCell>{requirementCount}</TableCell>
                <TableCell>{requirementCount > 0 ? '✓' : '○'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Acceptance Criteria</TableCell>
                <TableCell>{acCount}</TableCell>
                <TableCell>{acCount > 0 ? '✓' : '○'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Future Relationships (Coming Soon):
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            → Solution Reference (how is this implemented)
          </Typography>
          <Typography variant="body2" color="textSecondary">
            → Validation Evidence (how is this tested)
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
