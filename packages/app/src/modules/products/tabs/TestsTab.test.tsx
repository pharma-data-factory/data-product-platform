/**
 * The CI evidence import on the Tests tab (NXD-123): the button reads the
 * newest CI run, and the summary says what was recorded, what has no test,
 * and which ids the version does not carry.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestsTab, importSummaryLines } from './TestsTab';
import type { TestEvidenceImport } from '../api';

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
