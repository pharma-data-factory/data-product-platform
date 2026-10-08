import { useState } from 'react';
import { NEXORA_CARD, NEXORA_GREY, NEXORA_TONE } from '@internal/plugin-nexora-common';
import { Box, Button, Chip, Link, Typography } from '@material-ui/core';
import type {
  PullRequestEvidencePreview,
  RegistryClient,
  ReleaseProvenanceImport,
  TestEvidenceImport,
} from '../api';
import { RegistryPublication } from './RegistryPublication';
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
  /**
   * NXD-133. Reads the version's GitHub Release and records its commit and
   * image digest on the approved baseline, then reloads the baselines. Absent
   * when the viewer may not manage the product or no version is selected.
   */
  onImportReleaseProvenance?: () => Promise<ReleaseProvenanceImport>;
  /**
   * NXD-137. The registry version this product version's build became, and
   * the client to read and move it. Absent before the first registration.
   */
  artifactRef?: string;
  registry?: RegistryClient;
  /**
   * NXD-152. What each open pull request's CI run would verify of this
   * version's requirements. Read-only; absent when no version is selected.
   */
  onPreviewPullRequests?: () => Promise<PullRequestEvidencePreview>;
}

/** One line on what the import did in the Artifact Registry (NXD-137). */
export function registrationLine(
  registration: ReleaseProvenanceImport['registration'],
): string {
  switch (registration.status) {
    case 'registered':
      return `Registered in the Artifact Registry as ${registration.artifactRef} (${registration.lifecycle}).`;
    case 'already-registered':
      return `Already in the Artifact Registry as ${registration.artifactRef} (${registration.lifecycle}).`;
    default:
      return registration.reason ?? 'Not registered in the Artifact Registry.';
  }
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

type PullRequestRow = PullRequestEvidencePreview['pullRequests'][number];

const PR_REASON: Record<string, string> = {
  'no-completed-run': 'no completed CI run for this pull request yet',
  'no-evidence-artifact': 'its CI run uploaded no test evidence',
  inaccessible: 'Nexora cannot read this repository’s CI',
  'not-found': 'the run or its evidence was not found',
};

/** What one pull request would do to this version's verification (NXD-152). */
export function pullRequestLines(pr: PullRequestRow): string[] {
  if (!pr.available || !pr.coverage) {
    return [`No preview: ${PR_REASON[pr.reason ?? ''] ?? pr.reason ?? 'unknown'}.`];
  }
  const c = pr.coverage;
  const verdict = c.wouldPassCoverage ? 'would pass.' : 'would not pass.';
  const lines = [
    `${c.verified} of ${c.total} requirements would be verified — the gate's coverage ${verdict}`,
  ];
  if (c.newlyVerified.length) lines.push(`Newly verified: ${c.newlyVerified.join(', ')}`);
  if (c.newlyUnverified.length) {
    lines.push(`No longer verified (a test now fails): ${c.newlyUnverified.join(', ')}`);
  }
  if (c.unknownRequirements.length) {
    lines.push(`Tests name requirements this version does not carry: ${c.unknownRequirements.join(', ')}`);
  }
  if (pr.stale) lines.push('The run tested an older commit than the pull request now has.');
  return lines;
}

function PullRequestPreview(props: { onPreview: () => Promise<PullRequestEvidencePreview> }) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<PullRequestEvidencePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setPreview(await props.onPreview());
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-label="Pull request evidence" style={{ ...CARD_STYLE, marginBottom: 16 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" style={{ gap: 12 }}>
        <Typography variant="body2">
          What open pull requests would verify, from their own CI runs. A preview
          only: nothing is recorded until the change is merged.
        </Typography>
        <Button variant="outlined" disabled={busy} onClick={run}>
          {busy ? 'Checking…' : 'Check open pull requests'}
        </Button>
      </Box>
      {preview && !preview.available ? (
        <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
          No preview: {PR_REASON[preview.reason ?? ''] ?? preview.reason ?? 'unknown'}.
        </Typography>
      ) : null}
      {preview?.available && preview.pullRequests.length === 0 ? (
        <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
          No open pull requests.
        </Typography>
      ) : null}
      {preview?.pullRequests.map(pr => (
        <Box key={pr.number} mt={1}>
          <Typography variant="body2">
            <Link href={pr.url} target="_blank" rel="noopener noreferrer">
              #{pr.number}
            </Link>{' '}
            {pr.title}
            {pr.draft ? ' (draft)' : ''}
            {pr.author ? ` · ${pr.author}` : ''}
          </Typography>
          {pullRequestLines(pr).map(line => (
            <Typography key={line} variant="body2" color="textSecondary">
              {line}
            </Typography>
          ))}
        </Box>
      ))}
      {error ? (
        <Typography role="alert" variant="body2" style={{ color: NEXORA_TONE.danger.text, marginTop: 8 }}>
          {error}
        </Typography>
      ) : null}
    </section>
  );
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
          the requirements it verifies, and the default branch’s newest run is
          read. Nexora also reads it on its own while the version is a draft.
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

function ReleaseImport(props: { onImport: () => Promise<ReleaseProvenanceImport> }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReleaseProvenanceImport | null>(null);
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
    <section aria-label="Release provenance" style={{ ...CARD_STYLE, marginBottom: 16 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" style={{ gap: 12 }}>
        <Typography variant="body2">
          The release build comes from the product repository: a tag v&lt;version&gt;
          publishes a GitHub Release with the commit and image digest, and Nexora
          records them on the approved baseline.
        </Typography>
        <Button variant="outlined" disabled={busy} onClick={run}>
          {busy ? 'Importing…' : 'Import release provenance'}
        </Button>
      </Box>
      {result ? (
        <Box mt={1}>
          <Typography variant="body2">
            Release{' '}
            <Link href={result.release.url} target="_blank" rel="noopener noreferrer">
              {result.release.tag}
            </Link>{' '}
            · commit {result.release.commit.slice(0, 7)} ·{' '}
            {result.alreadyRecorded
              ? `already recorded on baseline ${result.baseline.baselineVersion}`
              : `recorded on baseline ${result.baseline.baselineVersion}`}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {result.image.reference ?? result.image.digest}
          </Typography>
          <Typography
            variant="body2"
            style={
              result.registration.status === 'failed'
                ? { color: NEXORA_TONE.danger.text }
                : undefined
            }
          >
            {registrationLine(result.registration)}
          </Typography>
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
  onImportReleaseProvenance,
  artifactRef,
  registry,
  onPreviewPullRequests,
}: TestsTabProps) {
  // The import answers the registry coordinate before the version list is
  // reloaded; the card should not wait for that.
  const [importedRef, setImportedRef] = useState<string | undefined>();
  const shownRef = artifactRef ?? importedRef;
  const importReleaseProvenance = onImportReleaseProvenance
    ? async () => {
        const result = await onImportReleaseProvenance();
        setImportedRef(result.registration.artifactRef);
        return result;
      }
    : undefined;
  return (
    <>
      <section>
        <Typography variant="h6" style={{ marginBottom: 12 }}>
          Verification
        </Typography>
        {onImportEvidence && coverage && coverage.byRequirement.length > 0 ? (
          <EvidenceImport onImport={onImportEvidence} />
        ) : null}
        {onPreviewPullRequests && coverage && coverage.byRequirement.length > 0 ? (
          <PullRequestPreview onPreview={onPreviewPullRequests} />
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
        {importReleaseProvenance &&
        baselines?.some(baseline => baseline.status === 'APPROVED') ? (
          <ReleaseImport onImport={importReleaseProvenance} />
        ) : null}
        {registry && shownRef ? (
          <RegistryPublication
            artifactRef={shownRef}
            loadVersion={registry.getVersion}
            transition={registry.transition}
          />
        ) : null}
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
