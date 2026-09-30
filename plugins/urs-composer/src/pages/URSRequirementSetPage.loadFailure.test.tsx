/**
 * NXD-094. Not knowing the approval state is not the same as there being none.
 *
 * `getApprovalInstance` and `listBaselines` both failed silently: the page then
 * said "No approval workflow active" / "No baselines yet" and offered to
 * create a baseline — for a set whose baseline was already in approval. The
 * first render test this page has had, and it is about the one thing that
 * must not look like an empty state.
 */

import { Route, Routes } from 'react-router-dom';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithApp } from '../__testUtils__';
import { ursComposerApiRef } from '../api/ursComposerApi';
import { URSStatus } from '../api/types';
import { URSRequirementSetPage } from './URSRequirementSetPage';

const set = {
  id: 'set-1',
  requirementSetId: 'URS-OEE-001',
  versionNumber: 1,
  businessCapabilityRefs: [],
  businessNeed: 'Measure OEE',
  solutionType: 'data-product',
  solutionName: 'OEE Product',
  status: URSStatus.IN_APPROVAL,
  createdBy: 'user:default/author',
  createdAt: '2026-09-30T00:00:00.000Z',
};

const requirement = {
  id: 'req-1',
  requirementSetId: 'set-1',
  requirementId: 'URS-OEE-001-R1',
  statement: 'The system shall compute OEE.',
  priority: 'MUST',
  status: URSStatus.IN_APPROVAL,
  createdBy: 'user:default/author',
  createdAt: '2026-09-30T00:00:00.000Z',
};

const baselineInApproval = {
  id: 'baseline-1',
  requirementSetId: 'set-1',
  baselineVersion: '1.0',
  status: URSStatus.IN_APPROVAL,
  requirementVersionIds: ['version-1'],
  revision: 1,
  createdAt: '2026-09-30T00:00:00.000Z',
  createdBy: 'user:default/author',
  approvalInstanceId: 'approval-1',
};

function api(overrides: Record<string, jest.Mock> = {}) {
  return {
    getRequirementSet: jest.fn().mockResolvedValue(set),
    listRequirements: jest.fn().mockResolvedValue([requirement]),
    getRequirementSetAudit: jest.fn().mockResolvedValue([]),
    listCurrentVersions: jest.fn().mockResolvedValue([]),
    listCapabilities: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    listBaselines: jest.fn().mockResolvedValue([baselineInApproval]),
    findValidationContext: jest.fn().mockResolvedValue(null),
    getApprovalInstance: jest
      .fn()
      .mockRejectedValue(new Error('Service Unavailable (503)')),
    ...overrides,
  };
}

async function renderPage(mock: ReturnType<typeof api>) {
  const result = await renderWithApp(
    <Routes>
      <Route path="/sets/:id" element={<URSRequirementSetPage />} />
    </Routes>,
    {
      apis: [[ursComposerApiRef, mock as any]],
      initialRouteEntries: ['/sets/set-1'],
    },
  );
  // The approval and baseline sections live on the Workflow tab.
  fireEvent.click(await screen.findByRole('tab', { name: 'Workflow' }));
  return result;
}

describe('URSRequirementSetPage when a load fails (NXD-094)', () => {
  it('says the approval status is unknown instead of "no workflow", and offers nothing that assumes none', async () => {
    await renderPage(api());

    expect(
      await screen.findByText('Could not load the approval status'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/No approval workflow active/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Create baseline/i }),
    ).not.toBeInTheDocument();
  });

  it('recovers on retry and shows the workflow', async () => {
    const mock = api();
    mock.getApprovalInstance
      .mockReset()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce({
        id: 'approval-1',
        baselineId: 'baseline-1',
        workflowId: 'wf-1',
        status: 'IN_PROGRESS',
        currentStepSequence: 1,
        steps: [],
        startedBy: 'user:default/author',
        startedAt: '2026-09-30T00:00:00.000Z',
      });
    await renderPage(mock);

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Approval Workflow')).toBeInTheDocument();
    expect(screen.queryByText(/Could not load/)).not.toBeInTheDocument();
    expect(mock.getApprovalInstance).toHaveBeenCalledTimes(2);
  });

  it('does not claim "No baselines yet" when the baseline list failed', async () => {
    await renderPage(
      api({
        listBaselines: jest.fn().mockRejectedValue(new Error('HTTP 500')),
      }),
    );

    expect(
      await screen.findByText(
        'Could not load the baselines, so the approval status is unknown',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('No baselines yet.')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Create baseline/i }),
    ).not.toBeInTheDocument();
  });

  it('still shows the honest empty state when there really are no baselines', async () => {
    await renderPage(api({ listBaselines: jest.fn().mockResolvedValue([]) }));

    expect(await screen.findByText('No baselines yet.')).toBeInTheDocument();
    expect(screen.queryByText(/Could not load/)).not.toBeInTheDocument();
  });
});
