/**
 * NXD-104. Three things a manual walk of the OEE approval chain ran into.
 *
 * - demo-author was offered Approve on a BUSINESS_REVIEWER step, filled in the
 *   signing dialog, and was refused by the server afterwards.
 * - The line above the chain read "Status: NOT_STARTED" for a chain that had
 *   been submitted and was waiting for its first signature.
 * - After the final signature the page kept "Current State: DRAFT" and
 *   "Validation handoff becomes available after a baseline is approved" on a
 *   baseline the server had already approved, until a browser reload.
 */

import { Route, Routes } from 'react-router-dom';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithApp } from '../__testUtils__';
import { ursComposerApiRef } from '../api/ursComposerApi';
import { URSStatus } from '../api/types';
import { URSRequirementSetPage } from './URSRequirementSetPage';

const set = {
  id: 'set-1',
  requirementSetId: 'URS-EPM',
  versionNumber: 1,
  businessCapabilityRefs: [],
  businessNeed: 'Measure OEE',
  solutionType: 'data-product',
  solutionName: 'Equipment Performance Management',
  status: URSStatus.DRAFT,
  createdBy: 'system',
  createdAt: '2026-09-21T00:00:00.000Z',
};

const baseline = {
  id: 'baseline-1',
  requirementSetId: 'set-1',
  baselineVersion: '1.0',
  status: URSStatus.IN_REVIEW,
  requirementVersionIds: ['version-1'],
  revision: 2,
  createdAt: '2026-10-01T00:00:00.000Z',
  createdBy: 'user:default/guest',
  approvalInstanceId: 'approval-1',
};

function chain(
  status: string,
  currentStepSequence: number,
  stepStatuses: string[],
) {
  const roles = ['BUSINESS_REVIEWER', 'PRODUCT_MANAGER', 'QUALITY_REVIEWER'];
  return {
    id: 'approval-1',
    baselineId: 'baseline-1',
    workflowId: 'standard-gxp-urs',
    status,
    currentStepSequence,
    startedBy: 'user:default/guest',
    startedAt: '2026-10-01T00:00:00.000Z',
    steps: stepStatuses.map((stepStatus, i) => ({
      id: `step-${i + 1}`,
      sequence: i + 1,
      role: roles[i],
      status: stepStatus,
      required: true,
    })),
  };
}

function api(roles: string[], overrides: Record<string, jest.Mock> = {}) {
  return {
    getRequirementSet: jest.fn().mockResolvedValue(set),
    listRequirements: jest.fn().mockResolvedValue([]),
    getRequirementSetAudit: jest.fn().mockResolvedValue([]),
    listCurrentVersions: jest.fn().mockResolvedValue([]),
    listCapabilities: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    listBaselines: jest.fn().mockResolvedValue([baseline]),
    findValidationContext: jest.fn().mockResolvedValue(null),
    getApprovalInstance: jest
      .fn()
      .mockResolvedValue(
        chain('NOT_STARTED', 1, ['PENDING', 'PENDING', 'PENDING']),
      ),
    getMyApprovalRoles: jest
      .fn()
      .mockResolvedValue({ userEntityRef: 'user:default/someone', roles }),
    ...overrides,
  };
}

async function renderPage(mock: ReturnType<typeof api>) {
  await renderWithApp(
    <Routes>
      <Route path="/sets/:id" element={<URSRequirementSetPage />} />
    </Routes>,
    {
      apis: [[ursComposerApiRef, mock as any]],
      initialRouteEntries: ['/sets/set-1'],
    },
  );
  fireEvent.click(await screen.findByRole('tab', { name: 'Workflow' }));
}

describe('URSRequirementSetPage approval chain (NXD-104)', () => {
  it('says what a submitted chain is waiting for', async () => {
    await renderPage(api(['BUSINESS_REVIEWER']));

    expect(
      await screen.findByText(
        'Waiting for step 1 (BUSINESS_REVIEWER) · submitted by user:default/guest',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/NOT_STARTED/)).not.toBeInTheDocument();
    expect(screen.getByText('Requirement set status')).toBeInTheDocument();
  });

  it('names the missing role instead of offering Approve to someone who cannot sign', async () => {
    await renderPage(api(['PRODUCT_MANAGER', 'AUTHOR']));

    expect(
      await screen.findByText(
        'Step 1 needs the BUSINESS_REVIEWER approval role. Your roles: PRODUCT_MANAGER, AUTHOR.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Approve' }),
    ).not.toBeInTheDocument();
  });

  it('offers Approve to the holder of the step role', async () => {
    await renderPage(api(['BUSINESS_REVIEWER']));

    expect(
      await screen.findByRole('button', { name: 'Approve' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/needs the .* approval role/),
    ).not.toBeInTheDocument();
  });

  it('shows the approved set and the validation handoff right after the final signature', async () => {
    const approveStep = jest
      .fn()
      .mockResolvedValue(
        chain('APPROVED', 3, ['APPROVED', 'APPROVED', 'APPROVED']),
      );
    const mock = api(['QUALITY_REVIEWER'], { approveStep });
    // What the server answers once the chain is complete.
    mock.listBaselines
      .mockResolvedValueOnce([baseline])
      .mockResolvedValue([{ ...baseline, status: URSStatus.APPROVED }]);
    mock.getRequirementSet
      .mockResolvedValueOnce(set)
      .mockResolvedValue({ ...set, status: URSStatus.APPROVED });
    // The page re-reads the instance once the baseline list changes.
    mock.getApprovalInstance
      .mockResolvedValueOnce(
        chain('IN_PROGRESS', 3, ['APPROVED', 'APPROVED', 'ACTIVE']),
      )
      .mockResolvedValue(
        chain('APPROVED', 3, ['APPROVED', 'APPROVED', 'APPROVED']),
      );

    await renderPage(mock);

    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    fireEvent.change(await screen.findByLabelText(/Signing PIN/), {
      target: { value: '1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }));

    // Three re-reads chain behind the signature (set, baselines, instance);
    // the default second is not enough under a full parallel test run.
    expect(
      await screen.findByRole(
        'button',
        { name: /Start Validation/ },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Validation handoff becomes available/),
    ).not.toBeInTheDocument();
    expect(approveStep).toHaveBeenCalledWith('approval-1', 'step-3', {
      comment: undefined,
      pin: '1234',
    });
    // Render, sign and three chained re-reads: 3 s alone, more than Jest's
    // default 5 s when the whole suite runs in parallel.
  }, 20000);
});
