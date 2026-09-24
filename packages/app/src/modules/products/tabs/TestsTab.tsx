import { NEXORA_CARD, NEXORA_GREY, NEXORA_TONE } from '@internal/plugin-nexora-common';
import { Box, Chip, Typography } from '@material-ui/core';
import type {
  ProductBaseline,
  ProductRequirementCoverage,
} from '@internal/platform-common';

interface TestsTabProps {
  coverage: ProductRequirementCoverage | null;
  baselines: ProductBaseline[] | null;
  error: string | null;
}

const CARD_STYLE = {
  border: `1px solid ${NEXORA_GREY[200]}`,
  borderRadius: 12,
  padding: 12,
  marginBottom: 8,
};

export function TestsTab({ coverage, baselines, error }: TestsTabProps) {
  return (
    <>
      <section>
        <Typography variant="h6" style={{ marginBottom: 12 }}>
          Verification
        </Typography>
        {!coverage || coverage.byRequirement.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No requirements on this version. Bind a URS baseline first — there
            is nothing to verify against until then.
          </Typography>
        ) : (
          <>
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
                {coverage.verified} of {coverage.total} requirement
                {coverage.total === 1 ? '' : 's'} verified
              </Typography>
            </Box>
            {coverage.byRequirement.map(row => (
              <section key={row.ursRequirementVersionId} style={CARD_STYLE}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="subtitle1">
                    {row.requirementRef}{' '}
                    <span style={{ color: NEXORA_GREY[500] }}>{row.title}</span>
                  </Typography>
                  <Chip
                    size="small"
                    label={row.verified ? 'VERIFIED' : 'NOT VERIFIED'}
                    style={{
                      backgroundColor: row.verified
                        ? NEXORA_TONE.success.bg
                        : NEXORA_TONE.danger.bg,
                      color: NEXORA_CARD,
                      fontWeight: 600,
                    }}
                  />
                </Box>
                <Typography variant="body2" color="textSecondary">
                  {row.testIds.length} test
                  {row.testIds.length === 1 ? '' : 's'} · {row.runIds.length}{' '}
                  run{row.runIds.length === 1 ? '' : 's'} ·{' '}
                  {row.findingIds.length} finding
                  {row.findingIds.length === 1 ? '' : 's'}
                </Typography>
              </section>
            ))}
          </>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <Typography variant="h6" style={{ marginBottom: 12 }}>
          Build evidence
        </Typography>
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
        {!error && baselines === null && (
          <Typography variant="body2" color="textSecondary">
            Loading baselines…
          </Typography>
        )}
        {!error && baselines !== null && baselines.length === 0 && (
          <Typography variant="body2" color="textSecondary">
            No baseline on this version. CI records the commit and the artifact
            digest against a baseline, so there is nowhere to put build
            evidence yet.
          </Typography>
        )}
        {!error &&
          baselines?.map(baseline => (
            <section key={baseline.id} style={CARD_STYLE}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="subtitle1">
                  Baseline {baseline.baselineVersion}
                </Typography>
                <Chip size="small" variant="outlined" label={baseline.status} />
              </Box>
              {/*
                `provenance` is absent, not null, until a release build posts
                it — so "not built yet" stays distinguishable from "recorded
                as empty". The display keeps that distinction.
              */}
              {baseline.provenance ? (
                <Typography variant="body2" color="textSecondary">
                  Commit {baseline.provenance.releaseCommitSha.slice(0, 12)} ·{' '}
                  {baseline.provenance.artifactDigest} ·{' '}
                  {baseline.provenance.provenanceTimestamp}
                  {baseline.provenance.provenanceRecordedBy
                    ? ` · recorded by ${baseline.provenance.provenanceRecordedBy}`
                    : ''}
                </Typography>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No build evidence recorded. CI posts the commit and artifact
                  digest when a release build runs against this baseline.
                </Typography>
              )}
            </section>
          ))}
      </section>
    </>
  );
}
