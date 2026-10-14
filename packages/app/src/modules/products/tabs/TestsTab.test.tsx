/**
 * The CI evidence import on the Tests tab (NXD-123): the button reads the
 * newest CI run, and the summary says what was recorded, what has no test,
 * and which ids the version does not carry.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestsTab, importSummaryLines, pullRequestLines, registrationLine } from './TestsTab';
import type { PullRequestEvidencePreview, ReleaseProvenanceImport, TestEvidenceImport } from '../api';

const coverage = {
  total: 2,
  verified: 0,
  byRequirement: [
    { ursRequirementVersionId: 'rv1', requirementRef: 'URS-EPM-001', title: 'OEE', verified: false, testIds: [], runIds: [], findingIds: [] },
    { ursRequirementVersionId: 'rv2', requirementRef: 'URS-EPM-002', title: 'Losses', verified: false, testIds: [], runIds: [], findingIds: [] },
  ],
} as any;

const result: TestEvidenceImport = {
  run: { id: 7, url: 'https://github.com/o/r/actions/runs/7', commit: 'abc1234def', conclusion: 'success' },
  imported: 3,
  skipped: 1,
  alreadyRecorded: 0,
  byRequirement: { 'URS-EPM-001': { passed: 2, failed: 1 } },
  uncoveredRequirements: ['URS-EPM-002'],
  unknownRequirements: ['URS-EPM-999'],
};

describe('TestsTab CI evidence import (NXD-123)', () => {
  it('summarises an import in plain lines', () => {
    expect(importSummaryLines(result)).toEqual([
      '3 test executions recorded, 1 skipped test not counted.',
      'URS-EPM-001: 2 passed, 1 failed',
      'No test in CI for: URS-EPM-002',
      'Tests name requirements this version does not carry: URS-EPM-999',
    ]);
  });

  it('imports on click and links the CI run', async () => {
    const onImport = jest.fn().mockResolvedValue(result);
    render(<TestsTab coverage={coverage} baselines={[]} error={null} onImportEvidence={onImport} />);
    fireEvent.click(screen.getByRole('button', { name: 'Import CI evidence' }));
    expect(await screen.findByRole('link', { name: '#7' })).toHaveAttribute(
      'href',
      'https://github.com/o/r/actions/runs/7',
    );
    expect(screen.getByText(/commit abc1234 · success/)).toBeInTheDocument();
    expect(screen.getByText('No test in CI for: URS-EPM-002')).toBeInTheDocument();
  });

  it('shows why there was nothing to import', async () => {
    const onImport = jest
      .fn()
      .mockRejectedValue(new Error('No test evidence to import: the repository has no completed CI run yet.'));
    render(<TestsTab coverage={coverage} baselines={[]} error={null} onImportEvidence={onImport} />);
    fireEvent.click(screen.getByRole('button', { name: 'Import CI evidence' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no completed CI run yet/);
  });

  it('offers no import without a way to run one', () => {
    render(<TestsTab coverage={coverage} baselines={[]} error={null} />);
    expect(screen.queryByRole('button', { name: 'Import CI evidence' })).not.toBeInTheDocument();
  });
});

describe('TestsTab release provenance import (NXD-133)', () => {
  const approved = { id: 'b1', baselineVersion: '1', status: 'APPROVED' } as any;
  const draft = { id: 'b2', baselineVersion: '2', status: 'DRAFT' } as any;
  const imported: ReleaseProvenanceImport = {
    baseline: { ...approved, provenance: { releaseCommitSha: 'a'.repeat(40) } },
    release: { tag: 'v1.0.0', url: 'https://github.com/o/r/releases/tag/v1.0.0', commit: 'abc1234'.padEnd(40, '0') },
    image: { digest: `sha256:${'b'.repeat(64)}`, reference: `ghcr.io/o/r@sha256:${'b'.repeat(64)}` },
    alreadyRecorded: false,
    registration: {
      status: 'registered',
      artifactRef: 'pharma-data-factory/oee-e2e-test-20261005-d@1.0.0',
      artifactVersionId: 'av-1',
      lifecycle: 'DRAFT',
    },
  };
  const button = () => screen.queryByRole('button', { name: 'Import release provenance' });

  it('offers the import only once a baseline is approved', () => {
    const onImport = jest.fn();
    const { rerender } = render(
      <TestsTab coverage={coverage} baselines={[draft]} error={null} onImportReleaseProvenance={onImport} />,
    );
    expect(button()).not.toBeInTheDocument();
    rerender(
      <TestsTab coverage={coverage} baselines={[approved]} error={null} onImportReleaseProvenance={onImport} />,
    );
    expect(button()).toBeInTheDocument();
  });

  it('links the release and names the baseline it was recorded on', async () => {
    const onImport = jest.fn().mockResolvedValue(imported);
    render(<TestsTab coverage={coverage} baselines={[approved]} error={null} onImportReleaseProvenance={onImport} />);
    fireEvent.click(button()!);
    expect(await screen.findByRole('link', { name: 'v1.0.0' })).toHaveAttribute(
      'href',
      'https://github.com/o/r/releases/tag/v1.0.0',
    );
    expect(screen.getByText(/commit abc1234 · recorded on baseline 1/)).toBeInTheDocument();
    expect(screen.getByText(imported.image.reference!)).toBeInTheDocument();
  });

  it('says when the build was already recorded', async () => {
    const onImport = jest.fn().mockResolvedValue({ ...imported, alreadyRecorded: true });
    render(<TestsTab coverage={coverage} baselines={[approved]} error={null} onImportReleaseProvenance={onImport} />);
    fireEvent.click(button()!);
    expect(await screen.findByText(/already recorded on baseline 1/)).toBeInTheDocument();
  });

  it('shows the refusal verbatim', async () => {
    const onImport = jest
      .fn()
      .mockRejectedValue(new Error('No release provenance to import: the repository has no published release v1.0.'));
    render(<TestsTab coverage={coverage} baselines={[approved]} error={null} onImportReleaseProvenance={onImport} />);
    fireEvent.click(button()!);
    expect(await screen.findByRole('alert')).toHaveTextContent(/no published release v1\.0/);
  });
});

describe('TestsTab registry card (NXD-137)', () => {
  const approved = { id: 'b1', baselineVersion: '1', status: 'APPROVED' } as any;
  const REF = 'pharma-data-factory/oee-e2e-test-20261005-d@1.0.0';
  const draft = {
    id: 'av-1',
    artifactId: 'a-1',
    version: '1.0.0',
    lifecycle: 'DRAFT',
    releaseBuild: {
      imageRepository: 'ghcr.io/pharma-data-factory/oee-e2e-test-20261005-d',
      imageDigest: 'sha256:6e696d5fc0b22f352bd5980c906f34d3af9c72e9a34ba70adc99453f752fd810',
      commitSha: '431fd71d0fcb5c9c56773f58fb451435db8f1c87',
    },
  } as any;

  it('names the registration under the import, then shows the card', async () => {
    const registry = { getVersion: jest.fn().mockResolvedValue(draft), transition: jest.fn() };
    const onImport = jest.fn().mockResolvedValue({
      baseline: approved,
      release: { tag: 'v1.0.0', url: 'https://github.com/o/r/releases/tag/v1.0.0', commit: '431fd71'.padEnd(40, '0') },
      image: { digest: draft.releaseBuild.imageDigest },
      alreadyRecorded: false,
      registration: { status: 'registered', artifactRef: REF, artifactVersionId: 'av-1', lifecycle: 'DRAFT' },
    });
    render(
      <TestsTab
        coverage={coverage}
        baselines={[approved]}
        error={null}
        onImportReleaseProvenance={onImport}
        registry={registry}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Import release provenance' }));
    expect(
      await screen.findByText(`Registered in the Artifact Registry as ${REF} (DRAFT).`),
    ).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Submit for testing' })).toBeInTheDocument();
    expect(registry.getVersion).toHaveBeenCalledWith(REF);
  });

  it('says why the registry did not take the build', () => {
    expect(
      registrationLine({ status: 'failed', reason: 'The Artifact Registry refused the build: no publisher.' }),
    ).toBe('The Artifact Registry refused the build: no publisher.');
  });
});

describe('TestsTab pull request preview (NXD-152)', () => {
  const preview: PullRequestEvidencePreview = {
    available: true,
    current: { verified: 1, total: 2 },
    pullRequests: [
      {
        number: 12,
        title: 'Implement URS-EPM-002',
        url: 'https://github.com/o/r/pull/12',
        headRef: 'ai/urs-epm-002',
        draft: false,
        author: 'claude',
        stale: true,
        available: true,
        coverage: {
          verified: 2,
          total: 2,
          wouldPassCoverage: true,
          newlyVerified: ['URS-EPM-002'],
          newlyUnverified: [],
          byRequirement: {},
          unknownRequirements: ['URS-EPM-777'],
        },
      },
      { number: 11, title: 'Old work', url: 'u', headRef: 'x', draft: true, available: false, reason: 'no-evidence-artifact' },
    ],
  };

  it('says what a pull request would verify, revoke or not know', () => {
    expect(pullRequestLines(preview.pullRequests[0])).toEqual([
      "2 of 2 requirements would be verified — the gate's coverage would pass.",
      'Newly verified: URS-EPM-002',
      'Tests name requirements this version does not carry: URS-EPM-777',
      'The run tested an older commit than the pull request now has.',
    ]);
    expect(pullRequestLines(preview.pullRequests[1])).toEqual([
      'No preview: its CI run uploaded no test evidence.',
    ]);
  });

  it('loads on click, not when the tab opens', async () => {
    const onPreview = jest.fn().mockResolvedValue(preview);
    render(<TestsTab coverage={coverage} baselines={[]} error={null} onPreviewPullRequests={onPreview} />);
    expect(onPreview).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Check open pull requests' }));
    expect(await screen.findByRole('link', { name: '#12' })).toHaveAttribute('href', 'https://github.com/o/r/pull/12');
    expect(screen.getByText('Newly verified: URS-EPM-002')).toBeInTheDocument();
    expect(screen.getByText(/Old work \(draft\)/)).toBeInTheDocument();
  });
});
