import { useState } from 'react';
import { NEXORA_GREY, NEXORA_TONE } from '@internal/plugin-nexora-common';
import { Box, Button, Chip, TextField, Typography } from '@material-ui/core';
import type {
  ProductBaseline,
  ProductVersion,
} from '@internal/platform-common';

/**
 * Creating and approving the ProductBaseline the release gate requires.
 *
 * `createProductBaseline` and `approveProductBaseline` were written, routed,
 * tested and exposed on the frontend client — and called from no page. So
 * `NO_APPROVED_BASELINE` was a blocker no user could clear, on a gate that
 * refuses to release without it.
 *
 * It lives beside the gate rather than on the Tests tab, where baselines are
 * also shown: Tests reads build evidence off a baseline that already exists,
 * and this is the act of making one. The blocker and its remedy belong on the
 * same screen.
 */

interface BaselinesSectionProps {
  selectedVersion?: ProductVersion;
  /** `null` while loading; the page owns the fetch. */
  baselines: ProductBaseline[] | null;
  busy: boolean;
  error: string | null;
  onCreate: (baselineVersion?: string) => Promise<void>;
  onApprove: (baselineId: string) => Promise<void>;
}

const STATUS_TONE: Record<string, string> = {
  DRAFT: NEXORA_TONE.neutral.text,
  APPROVED: NEXORA_TONE.success.bg,
  SUPERSEDED: NEXORA_TONE.danger.bg,
};

export function BaselinesSection({
  selectedVersion,
  baselines,
  busy,
  error,
  onCreate,
  onApprove,
}: BaselinesSectionProps) {
  const [label, setLabel] = useState('');

  if (!selectedVersion) {
    return null;
  }

  const approved = baselines?.find(b => b.status === 'APPROVED');

  const create = async () => {
    await onCreate(label.trim() || undefined);
    setLabel('');
  };

  return (
    <section style={{ marginTop: 24 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        marginBottom={1}
      >
        <Typography variant="h6">Baselines</Typography>
        {baselines !== null && (
          <Chip
            size="small"
            label={
              approved
                ? `Approved ${approved.baselineVersion}`
                : 'None approved'
            }
            style={{
              backgroundColor: approved
                ? NEXORA_TONE.success.bg
                : NEXORA_TONE.danger.bg,
              color: NEXORA_GREY[50],
              fontWeight: 600,
            }}
          />
        )}
      </Box>

      <Typography
        variant="body2"
        color="textSecondary"
        style={{ marginBottom: 12 }}
      >
        A baseline freezes what this version is — its components, contracts,
        traceability links and the URS baseline it implements — and the release
        gate requires an approved one. Creating a new baseline supersedes the
        approved one.
      </Typography>

      {error && (
        <Box marginBottom={2}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {baselines === null ? (
        <Typography variant="body2" color="textSecondary">
          Loading baselines…
        </Typography>
      ) : (
        <>
          {baselines.length === 0 && (
            <Typography variant="body2" color="textSecondary">
              No baseline on this version yet.
            </Typography>
          )}
          {baselines.map(baseline => (
            <Box
              key={baseline.id}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              style={{
                border: `1px solid ${NEXORA_GREY[200]}`,
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <Box>
                <Typography variant="subtitle1">
                  Baseline {baseline.baselineVersion}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {/*
                    Says which requirements the baseline claims. An approved
                    baseline with no URS binding is exactly what NO_URS_BASELINE
                    reports at the gate, so it is worth seeing before then.
                  */}
                  {baseline.ursBaselineIds?.length
                    ? `URS baseline ${baseline.ursBaselineIds.join(', ')}`
                    : 'No URS baseline — bind one on the Requirements tab before releasing'}
                  {baseline.approvedBy
                    ? ` · approved by ${baseline.approvedBy}`
                    : ''}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                <Chip
                  size="small"
                  label={baseline.status}
                  style={{
                    backgroundColor:
                      STATUS_TONE[baseline.status] ?? NEXORA_TONE.neutral.text,
                    color: NEXORA_GREY[50],
                    fontWeight: 600,
                  }}
                />
                {baseline.status === 'DRAFT' && (
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={busy}
                    onClick={() => onApprove(baseline.id)}
                  >
                    Approve
                  </Button>
                )}
              </Box>
            </Box>
          ))}

          <Box
            display="flex"
            alignItems="flex-start"
            style={{ gap: 16, marginTop: 16 }}
          >
            <TextField
              id="baseline-label"
              label="Baseline label"
              placeholder="Leave blank to number it"
              helperText="Often a QMS document number, so any label is accepted"
              value={label}
              onChange={e => setLabel(e.target.value)}
              style={{ minWidth: 280 }}
            />
            <Button
              variant="contained"
              color="primary"
              disabled={busy}
              onClick={create}
              style={{ marginTop: 8 }}
            >
              {busy ? 'Working…' : 'Create baseline'}
            </Button>
          </Box>
        </>
      )}
    </section>
  );
}
