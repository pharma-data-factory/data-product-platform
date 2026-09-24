import { useState } from 'react';
import {
  NEXORA_CARD,
  NEXORA_GREY,
  NEXORA_TONE,
} from '@internal/plugin-nexora-common';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  TextField,
  Typography,
} from '@material-ui/core';
import type { ApprovedBaselineOption } from '@internal/plugin-urs-composer';
import type {
  ProductComponent,
  ProductRequirementCoverage,
  ProductVersion,
} from '@internal/platform-common';

interface RequirementsTabProps {
  selectedVersion?: ProductVersion;
  components: ProductComponent[];
  coverage: ProductRequirementCoverage | null;
  approvedBaselines: ApprovedBaselineOption[];
  bindLoading: boolean;
  bindError: string | null;
  /** The page owns the call and the reload that follows it. */
  onBindBaseline: (ursBaselineId: string) => void;
}

/**
 * Why the baseline picker is disabled, when it is.
 *
 * Both reasons are refusals the server also enforces, so saying which one
 * applies here saves a round trip that would come back as an error message
 * the user could have been shown up front.
 */
function bindHelperText(
  version: ProductVersion,
  approvedBaselines: ApprovedBaselineOption[],
): string {
  if (version.status !== 'DRAFT') {
    return `Version is ${version.status}. A baseline can only be bound while the version is DRAFT.`;
  }
  if (approvedBaselines.length === 0) {
    return 'No approved URS baseline is available. Approve one in the URS Composer first.';
  }
  return 'Only approved baselines are listed.';
}

export function RequirementsTab({
  selectedVersion,
  components,
  coverage,
  approvedBaselines,
  bindLoading,
  bindError,
  onBindBaseline,
}: RequirementsTabProps) {
  const [baselineToBind, setBaselineToBind] = useState('');

  return (
    <section>
      <Typography variant="h6" style={{ marginBottom: 12 }}>
        Requirements
      </Typography>

      {!selectedVersion && (
        <Typography variant="body2" color="textSecondary">
          Create a version first. Requirements are bound to a version, not to
          the product, so the version records which requirements it was built
          against.
        </Typography>
      )}

      {selectedVersion && !selectedVersion.ursBaselineId && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="body2" color="textSecondary" paragraph>
              Version {selectedVersion.version} is not bound to a URS baseline.
              Binding copies the approved requirements onto this version, so it
              keeps the wording it was built against even after the URS is
              revised.
            </Typography>
            <Box
              style={{
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <TextField
                select
                id="urs-baseline"
                label="Approved URS baseline"
                value={baselineToBind}
                onChange={e => setBaselineToBind(e.target.value as string)}
                disabled={
                  selectedVersion.status !== 'DRAFT' ||
                  approvedBaselines.length === 0
                }
                style={{ minWidth: 360 }}
                helperText={bindHelperText(selectedVersion, approvedBaselines)}
              >
                <MenuItem value="">Select…</MenuItem>
                {approvedBaselines.map(option => (
                  <MenuItem key={option.baselineId} value={option.baselineId}>
                    {option.requirementSetKey} v{option.baselineVersion}
                    {option.solutionName ? ` — ${option.solutionName}` : ''}
                    {` (${option.requirementCount} requirement${
                      option.requirementCount === 1 ? '' : 's'
                    })`}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                color="primary"
                disabled={
                  !baselineToBind ||
                  bindLoading ||
                  selectedVersion.status !== 'DRAFT'
                }
                onClick={() => onBindBaseline(baselineToBind)}
              >
                {bindLoading ? 'Binding…' : 'Bind baseline'}
              </Button>
            </Box>
            {bindError && (
              <Box marginTop={2}>
                <Typography color="error" variant="body2">
                  {bindError}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {selectedVersion && selectedVersion.ursBaselineId && (
        <>
          <Box
            style={{
              display: 'flex',
              gap: 24,
              flexWrap: 'wrap',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <Typography variant="body2">
              Approved baseline:{' '}
              <strong>
                {approvedBaselines.find(
                  option => option.baselineId === selectedVersion.ursBaselineId,
                )?.baselineVersion ?? selectedVersion.ursBaselineId}
              </strong>
            </Typography>
            {coverage && (
              <>
                <Typography variant="body2">
                  {coverage.total} requirement{coverage.total === 1 ? '' : 's'}
                </Typography>
                <Chip
                  size="small"
                  label={`Mapped ${coverage.mapped}`}
                  style={{
                    backgroundColor: NEXORA_TONE.success.bg,
                    color: NEXORA_CARD,
                  }}
                />
                <Chip
                  size="small"
                  label={`Unmapped ${coverage.unmapped}`}
                  style={{
                    backgroundColor:
                      coverage.unmapped > 0
                        ? NEXORA_TONE.danger.bg
                        : NEXORA_TONE.neutral.text,
                    color: NEXORA_CARD,
                  }}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Verified ${coverage.verified}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    coverage.validationContextId
                      ? `Validated ${coverage.validated}`
                      : 'Validated — unknown'
                  }
                />
              </>
            )}
          </Box>

          {/*
            "unknown" rather than zero when no ValidationContext resolves.
            Rendering an unreachable validation-expert as "nothing is
            validated" states something about the product that was never
            checked.
          */}
          {coverage && !coverage.validationContextId && (
            <Typography
              variant="caption"
              color="textSecondary"
              style={{ display: 'block', marginBottom: 8 }}
            >
              No validation context resolved for this baseline, so validation
              status is unknown rather than negative. Create one in the
              Validation Expert to populate it.
            </Typography>
          )}

          {coverage?.byRequirement.map(row => {
            const names = row.componentIds
              .map(
                id =>
                  components.find(component => component.id === id)?.name ?? id,
              )
              .join(', ');
            return (
              <section
                key={row.ursRequirementVersionId}
                style={{
                  border: `1px solid ${NEXORA_GREY[200]}`,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="subtitle1">
                    {row.requirementRef}{' '}
                    <span style={{ color: NEXORA_GREY[500] }}>{row.title}</span>
                  </Typography>
                  <Box style={{ display: 'flex', gap: 8 }}>
                    {row.gxpRelevance && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`GxP ${row.gxpRelevance}`}
                      />
                    )}
                    <Chip
                      size="small"
                      label={row.mapping}
                      style={{
                        backgroundColor:
                          row.mapping === 'MAPPED'
                            ? NEXORA_TONE.success.bg
                            : NEXORA_TONE.danger.bg,
                        color: NEXORA_CARD,
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  {names
                    ? `Implemented by: ${names}`
                    : 'Not implemented by any component'}
                  {row.testIds.length > 0
                    ? ` · Verified by ${row.testIds.length} test${
                        row.testIds.length === 1 ? '' : 's'
                      }`
                    : ''}
                </Typography>
              </section>
            );
          })}
        </>
      )}
    </section>
  );
}
