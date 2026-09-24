import { Link } from '@backstage/core-components';
import { NEXORA_CARD, NEXORA_GREY, NEXORA_TONE } from '@internal/plugin-nexora-common';
import { Box, Chip, Typography } from '@material-ui/core';
import type { ProductRequirementCoverage } from '@internal/platform-common';

interface ValidationTabProps {
  coverage: ProductRequirementCoverage | null;
}

/**
 * Three states, not two.
 *
 * `validated` is `undefined` when no ValidationContext could be resolved — the
 * Validation Expert was unreachable or no context exists for the bound
 * baseline. Rendering that as "not validated" would state something about the
 * product that was never checked (NXD-055). The release gate fails closed on
 * the same input; a coverage view must not.
 */
function validationChip(validated: boolean | undefined) {
  if (validated === undefined) {
    return {
      label: 'UNKNOWN',
      background: NEXORA_TONE.neutral.text,
    };
  }
  return validated
    ? { label: 'VALIDATED', background: NEXORA_TONE.success.bg }
    : { label: 'NOT VALIDATED', background: NEXORA_TONE.danger.bg };
}

export function ValidationTab({ coverage }: ValidationTabProps) {
  if (!coverage || coverage.byRequirement.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        No requirements on this version. Bind a URS baseline first — formal
        validation is reported per requirement, so there is nothing to report
        against until then.
      </Typography>
    );
  }

  const contextResolved = Boolean(coverage.validationContextId);

  return (
    <section>
      <Typography variant="h6" style={{ marginBottom: 12 }}>
        Formal validation
      </Typography>

      <Box
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'baseline',
          marginBottom: 12,
        }}
      >
        <Typography variant="body2">
          {contextResolved
            ? `${coverage.validated} of ${coverage.total} requirement${
                coverage.total === 1 ? '' : 's'
              } validated`
            : 'Validation status unknown'}
        </Typography>
        {contextResolved && (
          <Link to={`/validation-expert/contexts/${coverage.validationContextId}`}>
            Open validation context
          </Link>
        )}
      </Box>

      {!contextResolved && (
        <Typography
          variant="body2"
          color="textSecondary"
          style={{ marginBottom: 12 }}
        >
          No validation context resolved for the bound baseline, so validation
          status is unknown rather than negative. A requirement shown as
          "unknown" has not been reported as failing — nothing has reported on
          it at all. Create a context in the Validation Expert to populate
          this.
        </Typography>
      )}

      {coverage.byRequirement.map(row => {
        const chip = validationChip(row.validated);
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
                  label={chip.label}
                  style={{
                    backgroundColor: chip.background,
                    color: NEXORA_CARD,
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Box>
          </section>
        );
      })}
    </section>
  );
}
