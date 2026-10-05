import { useState } from 'react';
import { NEXORA_CARD, NEXORA_GREY, NEXORA_TONE } from '@internal/plugin-nexora-common';
import { Box, Button, Chip, Link, Typography } from '@material-ui/core';
import type { TestEvidenceImport } from '../api';
import type {
  ProductBaseline,
  ProductRequirementCoverage,
} from '@internal/platform-common';

const CARD_STYLE = {
  border: `1px solid ${NEXORA_GREY[200]}`,
  borderRadius: 12,
  padding: 12,
  marginBottom: 8,
};

interface TestsTabProps {
  coverage: ProductRequirementCoverage | null;
  baselines: ProductBaseline[] | null;
  error: string | null;
  /**
   * NXD-123. Imports the newest CI run's test evidence and reloads the
   * coverage. Absent when the viewer may not manage the product or no
   * version is selected.
   */
  onImportEvidence?: () => Promise<TestEvidenceImport>;
}

/** One line per outcome of an import, for the summary under the button. */
export function importSummaryLines(result: TestEvidenceImport): string[] {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const parts = [`${plural(result.imported, 'test execution')} recorded`];
  if (result.alreadyRecorded) {
    parts.push(`${result.alreadyRecorded} already recorded`);
  }
  if (result.skipped) {
    parts.push(`${plural(result.skipped, 'skipped test')} not counted`);
  }
  const lines = [`${parts.join(', ')}.`];
  for (const [ref, tally] of Object.entries(result.byRequirement)) {
    lines.push(`${ref}: ${tally.passed} passed, ${tally.failed} failed`);
  }
  if (result.uncoveredRequirements.length) {
    lines.push(`No test in CI for: ${result.uncoveredRequirements.join(', ')}`);
  }
  if (result.unknownRequirements.length) {
    lines.push(
      `Tests name requirements this version does not carry: ${result.unknownRequirements.join(', ')}`,
    );
  }
  return lines;
}

function EvidenceImport(props: { onImport: () => Promise<TestEvidenceImport> }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TestEvidenceImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await props.onImport());
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-label="CI test evidence" style={{ ...CARD_STYLE, marginBottom: 16 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" style={{ gap: 12 }}>
        <Typography variant="body2">
          Test evidence comes from the product repository’s CI: each test names
          the requirements it verifies, and the newest completed run is read.
        </Typography>
        <Button variant="outlined" disabled={busy} onClick={run}>
          {busy ? 'Importing…' : 'Import CI evidence'}
        </Button>
      </Box>
      {result ? (
        <Box mt={1}>
          <Typography variant="body2">
            CI run{' '}
            <Link href={result.run.url} target="_blank" rel="noopener noreferrer">
              #{result.run.id}
            </Link>{' '}
            · commit {result.run.commit.slice(0, 7)} · {result.run.conclusion ?? 'unknown'}
          </Typography>
          {importSummaryLines(result).map(line => (
            <Typography key={line} variant="body2" color="textSecondary">
              {line}
            </Typography>
          ))}
        </Box>
      ) : null}
      {error ? (
        <Typography role="alert" variant="body2" style={{ color: NEXORA_TONE.danger.text, marginTop: 8 }}>
          {error}
        </Typography>
      ) : null}
    </section>
  );
}


export function TestsTab({
  coverage,
  baselines,
  error,
  onImportEvidence,
}: TestsTabProps) {
  return (
    <>
      <section>
        <Typography variant="h6" style={{ marginBottom: 12 }}>
          Verification
        </Typography>
        {onImportEvidence && coverage && coverage.byRequirement.length > 0 ? (
          <EvidenceImport onImport={onImportEvidence} />
        ) : null}
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
