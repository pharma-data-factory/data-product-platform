import { NEXORA_TONE } from '@internal/plugin-nexora-common';
import {
  Box,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import type { Product, ProductVersion } from '@internal/platform-common';
import type { ReleaseGateResult } from '../api';

/**
 * Which transitions a version in each status offers.
 *
 * The server decides; this only stops the UI from offering a transition that
 * would come back as an error.
 */
const TRANSITIONS: Record<string, Array<{ label: string; target: string }>> = {
  DRAFT: [{ label: 'Approve', target: 'APPROVED' }],
  APPROVED: [{ label: 'Mark as Release Candidate', target: 'RELEASE_CANDIDATE' }],
  RELEASE_CANDIDATE: [
    { label: 'Release', target: 'RELEASED' },
    { label: 'Revert to Draft', target: 'DRAFT' },
  ],
  RELEASED: [{ label: 'Supersede', target: 'SUPERSEDED' }],
};

interface OverviewTabProps {
  product: Product;
  versions: ProductVersion[];
  selectedVersion?: ProductVersion;
  gateResult: ReleaseGateResult | null;
  gateLoading: boolean;
  transitionLoading: boolean;
  actionError: string | null;
  onCreateVersion: () => void;
  onCheckGate: () => void;
  onTransition: (targetStatus: string) => void;
}

export function OverviewTab({
  product,
  versions,
  selectedVersion,
  gateResult,
  gateLoading,
  transitionLoading,
  actionError,
  onCreateVersion,
  onCheckGate,
  onTransition,
}: OverviewTabProps) {
  return (
    <>
      <Typography variant="body2" color="textSecondary">
        {product.description || 'No description'} ·{' '}
        {product.domain || 'no domain'} · {product.lifecycle}
      </Typography>

      <section style={{ marginTop: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Typography variant="h6">Release Management</Typography>
          <Button variant="contained" color="primary" onClick={onCreateVersion}>
            New version
          </Button>
        </div>

        {versions.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No versions yet. Create a version to add components.
          </Typography>
        ) : (
          <>
            {actionError && (
              <Box marginBottom={2}>
                <Typography color="error">{actionError}</Typography>
              </Box>
            )}

            {selectedVersion && TRANSITIONS[selectedVersion.status] && (
              <Box style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {TRANSITIONS[selectedVersion.status].map(t => (
                  <Button
                    key={t.target}
                    variant={t.target === 'RELEASED' ? 'contained' : 'outlined'}
                    color={t.target === 'RELEASED' ? 'primary' : 'default'}
                    disabled={transitionLoading}
                    onClick={() => onTransition(t.target)}
                  >
                    {t.label}
                  </Button>
                ))}
              </Box>
            )}

            {selectedVersion && selectedVersion.status === 'RELEASE_CANDIDATE' && (
              <Card variant="outlined" style={{ marginBottom: 16 }}>
                <CardContent>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    marginBottom={1}
                  >
                    <Typography variant="subtitle2">Release Gate</Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={gateLoading}
                      onClick={onCheckGate}
                    >
                      {gateLoading ? 'Checking...' : 'Check Gate'}
                    </Button>
                  </Box>
                  {gateResult &&
                    (gateResult.passed ? (
                      <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircleIcon style={{ color: NEXORA_TONE.success.text }} />
                        <Typography
                          style={{
                            color: NEXORA_TONE.success.text,
                            fontWeight: 600,
                          }}
                        >
                          All checks passed — ready to release
                        </Typography>
                      </Box>
                    ) : (
                      <List dense>
                        {gateResult.blockers.map((b, i) => (
                          <ListItem key={i}>
                            <ErrorIcon
                              style={{
                                color: NEXORA_TONE.danger.text,
                                marginRight: 8,
                              }}
                              fontSize="small"
                            />
                            <ListItemText primary={b.code} secondary={b.message} />
                          </ListItem>
                        ))}
                      </List>
                    ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </section>
    </>
  );
}
